import {
  Action,
  ActionPanel,
  AI,
  Form,
  getPreferenceValues,
  Icon,
  LaunchProps,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { BranchDropdown } from "./components/BranchDropdown";
import { SourceDropdown } from "./components/SourceDropdown";
import { createSession, useSources } from "./jules";
import { AutomationMode, Source } from "./types";
import { refreshMenuBar } from "./utils";

type Values = {
  prompt: string;
  sourceId: string;
  startingBranch?: string;
  requirePlanApproval?: boolean;
  autoCreatePR?: boolean;
};

interface LaunchContext {
  source?: string;
}

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const preferences = getPreferenceValues<Preferences>();
  const { data: sources, isLoading: isLoadingSources } = useSources();
  const initialSource = props.launchContext?.source;
  const [selectedSource, setSelectedSource] = useState<Source | undefined>(undefined);

  const { reset, focus, handleSubmit, itemProps, setValue } = useForm<Values>({
    validation: {
      prompt: FormValidation.Required,
      sourceId: FormValidation.Required,
    },
    initialValues: {
      sourceId: initialSource,
      requirePlanApproval: preferences.requirePlanApproval,
      autoCreatePR: preferences.autoCreatePR,
      startingBranch: "",
    },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Launching Jules Session" });

      try {
        let startingBranch = values.startingBranch;

        if (!startingBranch) {
          const selectedSource = sources?.find((s) => s.name === values.sourceId);
          if (selectedSource?.githubRepo?.defaultBranch?.displayName) {
            startingBranch = selectedSource.githubRepo.defaultBranch.displayName;
          } else {
            // Fallback to "main" if we can't find the source or its default branch
            startingBranch = "main";
          }
        }

        const response = await createSession({
          prompt: values.prompt,
          sourceContext: {
            source: values.sourceId,
            githubRepoContext: { startingBranch },
          },
          requirePlanApproval: values.requirePlanApproval,
          automationMode: values.autoCreatePR
            ? AutomationMode.AUTO_CREATE_PR
            : AutomationMode.AUTOMATION_MODE_UNSPECIFIED,
        });

        await refreshMenuBar();

        reset();
        focus("prompt");

        toast.style = Toast.Style.Success;
        toast.title = "Launched Jules Session";
        toast.primaryAction = {
          title: "Open in Browser",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          async onAction() {
            await open(response.url);
          },
        };
      } catch (e) {
        await showFailureToast(e, {
          title: "Failed launching Jules session",
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Task" onSubmit={handleSubmit} />
          <Action
            title="Improve Prompt"
            icon={Icon.Wand}
            onAction={async () => {
              if (itemProps.prompt.value) {
                try {
                  const improvedPrompt = await AI.ask(
                    `Refine the following instruction for a helpful AI software engineer named Jules. Return only the refined instruction, nothing else:\n\n${itemProps.prompt.value}`,
                  );
                  setValue("prompt", improvedPrompt);
                } catch (e) {
                  showFailureToast(e, { title: "Failed to improve prompt" });
                }
              } else {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please enter a prompt first",
                });
              }
            }}
          />
        </ActionPanel>
      }
      isLoading={isLoadingSources}
    >
      <Form.TextArea title="Prompt" placeholder="What should Jules do?" {...itemProps.prompt} />

      <Form.Separator />

      <SourceDropdown
        onSelectionChange={(value) => {
          itemProps.sourceId.onChange?.(value);
          const source = sources?.find((s) => s.name === value);
          setSelectedSource(source);
          if (source?.githubRepo?.defaultBranch?.displayName) {
            setValue("startingBranch", source.githubRepo.defaultBranch.displayName);
          }
        }}
        value={itemProps.sourceId.value}
      />

      <BranchDropdown selectedSource={selectedSource} itemProps={itemProps} />

      <Form.Separator />

      <Form.Description title="Options" text="Configure how Jules should work" />

      <Form.Checkbox
        label="Require plan approval"
        info="If enabled, Jules will wait for you to approve the plan before starting work."
        {...itemProps.requirePlanApproval}
      />

      <Form.Checkbox
        label="Automatically create a PR"
        info="If enabled, Jules will automatically create a Pull Request when finished."
        {...itemProps.autoCreatePR}
      />
    </Form>
  );
}
