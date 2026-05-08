import {
  AI,
  Action,
  ActionPanel,
  Clipboard,
  Form,
  PopToRootType,
  Toast,
  captureException,
  closeMainWindow,
  environment,
  showHUD,
  showToast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import { alias, domains } from "./api";
import { formatAPIError } from "./error-handler";

type FormValues = {
  purpose: string;
};

const AI_PROMPT = (purpose: string) => `Generate an email alias name and description for: "${purpose}"

Respond with ONLY a JSON object, no other text:
{
  "local_part": "slug-style-name",
  "description": "Brief description"
}

local_part rules: lowercase letters, numbers, and hyphens only; 3–20 characters; no spaces or underscores
description rules: max 50 characters; clear and concise`;

const CreateAliasAI = () => {
  const canUseAI = environment.canAccess(AI);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit({ purpose }) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Generating alias..." });

      try {
        const [options, raw] = await Promise.all([
          domains.options(),
          AI.ask(AI_PROMPT(purpose), { creativity: "none" }),
        ]);

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI returned an unexpected response format");
        const { local_part, description } = JSON.parse(jsonMatch[0]) as { local_part: string; description: string };

        const isSharedDomain = options.sharedDomains.includes(options.defaultAliasDomain);
        const fallbackFormat =
          options.defaultAliasFormat === "custom" ? "random_characters" : options.defaultAliasFormat;

        const response = await alias.create({
          description,
          domain: options.defaultAliasDomain,
          format: isSharedDomain ? fallbackFormat : "custom",
          ...(isSharedDomain ? {} : { local_part }),
        });

        if (!response.id) throw new Error("Unknown error");

        toast.style = Toast.Style.Success;
        toast.title = "Alias generated successfully";

        await Clipboard.copy(response.email);
        await closeMainWindow();
        await showHUD("Alias copied to clipboard", { popToRootType: PopToRootType.Immediate });
      } catch (error) {
        captureException(error);
        const formatted = formatAPIError(error, "Failed to generate alias");
        toast.style = Toast.Style.Failure;
        toast.title = formatted.title;
        toast.message = formatted.message;
      }
    },
    validation: {
      purpose: (value) => {
        if (!value || value.trim().length < 2) return "Describe the purpose of this alias";
      },
    },
  });

  if (!canUseAI) {
    return (
      <Form>
        <Form.Description text="Raycast AI is required for this command. Please upgrade your Raycast plan to use AI features." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Alias" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.purpose}
        autoFocus
        info="Describe what this alias is for. AI will pick a meaningful name and description."
        placeholder="e.g. Amazon shopping, tech newsletters, GitHub signups"
        title="Purpose"
      />
    </Form>
  );
};

export default CreateAliasAI;
