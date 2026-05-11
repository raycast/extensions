import { ActionPanel, Action, showToast, Toast, Form, useNavigation, Icon } from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import type { CreateChatRequest, ScopeSummary } from "./types";
import ChatDetail from "./components/ChatDetail";
import { useProjects } from "./hooks/useProjects";
import { useActiveProfile } from "./hooks/useActiveProfile";
import { useScopes } from "./hooks/useScopes";
import { v0ApiFetcher, V0ApiError } from "./lib/v0-api-utils";
import InitializeChat from "./initialize-chat";
import { useEffect } from "react";
import type { CreateChatResponse } from "./types";
import fs from "fs/promises";

interface FormValues {
  message: string;
  system?: string;
  chatPrivacy: string;
  projectId?: string;
  modelId?: "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg" | "v0-gpt-5";
  imageGenerations?: boolean;
  thinking?: boolean;
  scopeId?: string;
  attachments: string[];
}

export default function Command() {
  const { push } = useNavigation();
  const { projects, isLoadingProjects } = useProjects();
  const { activeProfileApiKey, activeProfileDefaultScope, isLoadingProfileDetails } = useActiveProfile();
  const { scopes: scopesData, isLoadingScopes } = useScopes(activeProfileApiKey);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: {
      message: "",
      chatPrivacy: "private",
      scopeId: activeProfileDefaultScope || "",
      attachments: [],
      modelId: "v0-gpt-5",
    },
    onSubmit: async (values) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.", {
          title: "Create Failed",
        });
        return;
      }
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating chat...",
      });

      try {
        const requestBody: CreateChatRequest = {
          message: values.message,
          chatPrivacy: values.chatPrivacy as "public" | "private" | "team-edit" | "team" | "unlisted",
          ...(values.system && { system: values.system }),
          ...(values.projectId && { projectId: values.projectId }),
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

        const chatResponse = await v0ApiFetcher<CreateChatResponse>("https://api.v0.dev/v1/chats", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "Content-Type": "application/json",
            "x-scope": values.scopeId || activeProfileDefaultScope || "",
          },
          body: JSON.stringify(requestBody),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Chat Created";
        toast.message = "Your new chat has been created successfully!";

        // Navigate to the newly created chat's detail page
        push(
          <ChatDetail
            chatId={chatResponse.id}
            scopeId={(values.scopeId as string | undefined) || (activeProfileDefaultScope ?? undefined)}
          />,
        );

        return;
      } catch (error) {
        if (error instanceof V0ApiError) {
          showFailureToast(error.message, { title: "Create Failed" });
        } else {
          showFailureToast(`Failed to create chat: ${error instanceof Error ? error.message : String(error)}`, {
            title: "Create Failed",
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

  // Set the default scope once profile details are loaded
  useEffect(() => {
    if (!isLoadingProfileDetails && activeProfileDefaultScope) {
      setValue("scopeId", activeProfileDefaultScope);
    }
  }, [activeProfileDefaultScope, isLoadingProfileDetails, setValue]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Chat" onSubmit={handleSubmit} />
          <Action.Push title="Initialize Chat from Files/url" target={<InitializeChat />} icon={Icon.Upload} />
        </ActionPanel>
      }
      isLoading={isLoadingProjects || isLoadingScopes || isLoadingProfileDetails}
    >
      <Form.TextArea
        {...itemProps.message}
        title="Message"
        placeholder="Ask v0 to build..."
        info="Your initial message to v0. This will start the conversation."
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
        <Form.Dropdown.Item value="v0-gpt-5" title="v0-gpt-5" />
        <Form.Dropdown.Item value="v0-1.5-sm" title="v0-1.5-sm" />
        <Form.Dropdown.Item value="v0-1.5-md" title="v0-1.5-md" />
        <Form.Dropdown.Item value="v0-1.5-lg" title="v0-1.5-lg" />
      </Form.Dropdown>

      <Form.Dropdown
        id="scopeId"
        title="Scope (Optional)"
        value={itemProps.scopeId.value || ""}
        onChange={itemProps.scopeId.onChange}
        isLoading={isLoadingScopes}
      >
        <Form.Dropdown.Item value="" title="None" />
        {scopesData?.map((scope: ScopeSummary) => (
          <Form.Dropdown.Item key={scope.id} value={scope.id} title={scope.name || "Untitled Scope"} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="projectId"
        title="Assign to Project (Optional)"
        value={itemProps.projectId.value || ""}
        onChange={itemProps.projectId.onChange}
        isLoading={isLoadingProjects}
      >
        <Form.Dropdown.Item value="" title="None" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        {...itemProps.system}
        title="System Instructions (Optional)"
        placeholder="Optional system instructions for v0..."
        info="Additional context or instructions for how v0 should respond."
      />

      <Form.Dropdown title="Privacy" {...itemProps.chatPrivacy}>
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="team" title="Team" />
        <Form.Dropdown.Item value="team-edit" title="Team (Editable)" />
        <Form.Dropdown.Item value="unlisted" title="Unlisted" />
      </Form.Dropdown>
    </Form>
  );
}
