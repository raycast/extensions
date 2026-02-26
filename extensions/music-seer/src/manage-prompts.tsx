import { Action, ActionPanel, Alert, Form, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";
import { DEFAULT_INTERPRETATION_PROMPTS, InterpretationPrompt, normalizePromptId } from "./interpretation-prompts";

type PromptFormProps = {
  title: string;
  submitTitle: string;
  initialValues?: {
    promptTitle: string;
    instruction: string;
  };
  onSubmit: (values: { promptTitle: string; instruction: string }) => Promise<boolean>;
};

function PromptForm({ title, submitTitle, initialValues, onSubmit }: PromptFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            onSubmit={async (values) => {
              const typedValues = values as { promptTitle: string; instruction: string };
              const shouldPop = await onSubmit(typedValues);
              if (shouldPop) {
                await pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="promptTitle"
        title="Title"
        placeholder="Themes & Symbolism"
        defaultValue={initialValues?.promptTitle ?? ""}
      />
      <Form.TextArea
        id="instruction"
        title="Instruction"
        placeholder="Explain what the AI should focus on..."
        defaultValue={initialValues?.instruction ?? ""}
      />
    </Form>
  );
}

export default function Command() {
  const { value, setValue, isLoading } = useLocalStorage<InterpretationPrompt[]>(
    "interpretation-prompts",
    DEFAULT_INTERPRETATION_PROMPTS,
  );
  const {
    value: defaultPromptId,
    setValue: setDefaultPromptId,
    isLoading: isDefaultPromptLoading,
  } = useLocalStorage<string>("default-interpretation-prompt-id", DEFAULT_INTERPRETATION_PROMPTS[0].id);

  const prompts = useMemo(() => value ?? DEFAULT_INTERPRETATION_PROMPTS, [value]);

  const resolvedDefaultPromptId = prompts.some((prompt) => prompt.id === defaultPromptId)
    ? defaultPromptId
    : prompts[0]?.id || "";

  return (
    <List isLoading={isLoading || isDefaultPromptLoading} searchBarPlaceholder="Manage interpretation prompts...">
      <List.Section title="Prompts">
        {prompts.map((prompt) => (
          <List.Item
            key={`${prompt.id}-${prompt.id === resolvedDefaultPromptId ? "default" : "normal"}`}
            title={prompt.title}
            subtitle={prompt.id}
            accessories={[
              ...(prompt.id === resolvedDefaultPromptId ? [{ tag: "Default" }] : []),
              { text: `${prompt.instruction.length} chars` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Prompt"
                  icon={Icon.Pencil}
                  target={
                    <PromptForm
                      title="Edit Prompt"
                      submitTitle="Save Prompt"
                      initialValues={{
                        promptTitle: prompt.title,
                        instruction: prompt.instruction,
                      }}
                      onSubmit={async (formValues) => {
                        const title = formValues.promptTitle.trim();
                        const instruction = formValues.instruction.trim();
                        if (!title || !instruction) {
                          return false;
                        }

                        const normalized = normalizePromptId(title);
                        const finalId =
                          normalized === prompt.id || !prompts.some((p) => p.id === normalized)
                            ? normalized
                            : prompt.id;
                        const nextPrompt: InterpretationPrompt = {
                          id: finalId,
                          title,
                          instruction,
                        };

                        await setValue(prompts.map((item) => (item.id === prompt.id ? nextPrompt : item)));
                        if (prompt.id === resolvedDefaultPromptId) {
                          await setDefaultPromptId(finalId);
                        }
                        return true;
                      }}
                    />
                  }
                />
                <Action
                  title="Set as Default"
                  icon={Icon.Star}
                  onAction={async () => {
                    await setDefaultPromptId(prompt.id);
                  }}
                />
                <Action
                  title="Delete Prompt"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete Prompt?",
                      message: `This will remove "${prompt.title}".`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });

                    if (!confirmed) {
                      return;
                    }

                    const nextPrompts = prompts.filter((p) => p.id !== prompt.id);
                    await setValue(nextPrompts);

                    if (prompt.id === resolvedDefaultPromptId) {
                      const nextDefault = nextPrompts[0]?.id || DEFAULT_INTERPRETATION_PROMPTS[0].id;
                      await setDefaultPromptId(nextDefault);
                    }
                  }}
                />
                <Action.CopyToClipboard title="Copy Prompt ID" content={prompt.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Add Prompt"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Prompt"
                target={
                  <PromptForm
                    title="Add Prompt"
                    submitTitle="Create Prompt"
                    onSubmit={async (formValues) => {
                      const title = formValues.promptTitle.trim();
                      const instruction = formValues.instruction.trim();
                      if (!title || !instruction) {
                        return false;
                      }

                      const baseId = normalizePromptId(title);
                      let id = baseId;
                      let counter = 2;
                      while (prompts.some((p) => p.id === id)) {
                        id = `${baseId}-${counter}`;
                        counter += 1;
                      }

                      await setValue(
                        prompts.concat({
                          id,
                          title,
                          instruction,
                        }),
                      );
                      return true;
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Reset to Defaults"
          icon={Icon.RotateAntiClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Reset to Defaults"
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Reset prompts?",
                    message: "This replaces all current prompts with the default prompt set.",
                    primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
                  });

                  if (!confirmed) {
                    return;
                  }

                  await setValue(DEFAULT_INTERPRETATION_PROMPTS);
                  await setDefaultPromptId(DEFAULT_INTERPRETATION_PROMPTS[0].id);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
