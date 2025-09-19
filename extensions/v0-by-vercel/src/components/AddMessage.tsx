import { ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import type { CreateMessageRequest } from "../types";
import ChatMessages from "./ChatMessages";
import { useActiveProfile } from "../hooks/useActiveProfile";
import fs from "fs/promises";

interface FormValues {
  message: string;
  modelId?: "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg" | "v0-gpt-5";
  imageGenerations?: boolean;
  thinking?: boolean;
  attachments: string[];
}

interface AddMessageProps {
  chatId: string;
  chatTitle?: string;
  revalidateChats: () => void;
  scopeId?: string; // Add scopeId to props
}

export default function AddMessage({ chatId, chatTitle, revalidateChats, scopeId }: AddMessageProps) {
  const { push } = useNavigation();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      message: "",
      modelId: "v0-gpt-5",
      imageGenerations: undefined,
      thinking: undefined,
      attachments: [],
    },
    onSubmit: async (values) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.", {
          title: "Send Failed",
        });
        return;
      }

      try {
        const followUpRequest: CreateMessageRequest = {
          message: values.message,
          modelConfiguration: {
            ...(values.modelId && { modelId: values.modelId }),
            ...(typeof values.imageGenerations === "boolean" && { imageGenerations: values.imageGenerations }),
            ...(typeof values.thinking === "boolean" && { thinking: values.thinking }),
          },
        };

        if (values.attachments && values.attachments.length > 0) {
          const attachments = await Promise.all(
            values.attachments.map(async (filePath) => {
              const fileContent = await fs.readFile(filePath, { encoding: "base64" });
              const mimeType = "application/octet-stream";
              return { url: `data:${mimeType};base64,${fileContent}` };
            }),
          );
          followUpRequest.attachments = attachments;
        }

        // Trim empty modelConfiguration
        if (followUpRequest.modelConfiguration && Object.keys(followUpRequest.modelConfiguration).length === 0) {
          delete followUpRequest.modelConfiguration;
        }

        // Navigate to chat messages view and start streaming the follow-up there
        push(
          <ChatMessages
            chatId={chatId}
            apiKey={activeProfileApiKey}
            followUpRequest={followUpRequest}
            scopeId={scopeId || activeProfileDefaultScope || ""}
          />,
        );

        revalidateChats();

        return;
      } catch (error) {
        showFailureToast(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`, {
          title: "Send Failed",
        });
        throw error;
      }
    },
    validation: {
      message: (value) => {
        if (!value || value.length === 0) {
          return "Message is required";
        }
        if (value.length > 10000) {
          return "Message is too long (max 10,000 characters)";
        }
      },
    },
  });

  const displayTitle = chatTitle || "Untitled Chat"; // Use chatTitle prop

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoadingProfileDetails}
    >
      <Form.TextArea
        {...itemProps.message}
        title="Message"
        placeholder="Describe what you want to build or ask a question..."
        info="Your message to v0. This will continue the conversation."
      />
      <Form.FilePicker
        id="attachments"
        title="Attachments"
        allowMultipleSelection
        value={itemProps.attachments.value}
        onChange={itemProps.attachments.onChange}
        info="Select files to attach to your message. Files will be converted to data URLs."
      />
      <Form.Dropdown
        id="modelId"
        title="Model"
        value={itemProps.modelId.value || ""}
        onChange={(newValue) =>
          itemProps.modelId.onChange?.(newValue as "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg" | "v0-gpt-5" | undefined)
        }
      >
        <Form.Dropdown.Item value="v0-1.5-sm" title="v0-1.5-sm" />
        <Form.Dropdown.Item value="v0-1.5-md" title="v0-1.5-md" />
        <Form.Dropdown.Item value="v0-1.5-lg" title="v0-1.5-lg" />
        <Form.Dropdown.Item value="v0-gpt-5" title="v0-gpt-5" />
      </Form.Dropdown>
      <Form.Description title="Chat" text={displayTitle} />
    </Form>
  );
}
