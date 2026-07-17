import { ActionPanel, Action, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import type { CreateMessageRequest } from "../types";
import ChatDetail from "./ChatDetail";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { v0ApiFetcher, V0ApiError } from "../lib/v0-api-utils";
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

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending message...",
      });

      try {
        const requestBody: CreateMessageRequest = {
          message: values.message,
          modelConfiguration: {
            ...(values.modelId && { modelId: values.modelId }),
            ...(typeof values.imageGenerations === "boolean" && { imageGenerations: values.imageGenerations }),
            ...(typeof values.thinking === "boolean" && { thinking: values.thinking }),
          },
          responseMode: "async",
        };

        if (values.attachments && values.attachments.length > 0) {
          const attachments = await Promise.all(
            values.attachments.map(async (filePath) => {
              const fileContent = await fs.readFile(filePath, { encoding: "base64" });
              const mimeType = "application/octet-stream"; // Default MIME type
              // You might want to infer the MIME type based on the file extension
              // For simplicity, we'll use a generic one here.
              return { url: `data:${mimeType};base64,${fileContent}` };
            }),
          );
          requestBody.attachments = attachments;
        }

        // Remove modelConfiguration if it's empty
        if (requestBody.modelConfiguration && Object.keys(requestBody.modelConfiguration).length === 0) {
          delete requestBody.modelConfiguration;
        }

        await v0ApiFetcher<CreateMessageRequest>(`https://api.v0.dev/v1/chats/${chatId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "Content-Type": "application/json",
            "x-scope": scopeId || activeProfileDefaultScope || "", // Use scopeId if available, otherwise default
          },
          body: JSON.stringify(requestBody),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Message Sent";
        toast.message = "Your message has been sent successfully!";

        // Push back to the chat detail to show the new message
        push(<ChatDetail chatId={chatId} scopeId={scopeId} />);

        revalidateChats();

        return;
      } catch (error) {
        if (error instanceof V0ApiError) {
          showFailureToast(error.message, { title: "Send Failed" });
        } else {
          showFailureToast(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`, {
            title: "Send Failed",
          });
        }
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
