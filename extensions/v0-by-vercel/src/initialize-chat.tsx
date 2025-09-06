import { ActionPanel, Action, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import { useProjects } from "./hooks/useProjects";
import { useActiveProfile } from "./hooks/useActiveProfile";
import { useScopes } from "./hooks/useScopes";
import { v0ApiFetcher, V0ApiError } from "./lib/v0-api-utils";
import { readFilesFromPaths, type FileContent } from "./lib/file-utils";

import ChatMessages from "./components/ChatMessages";
import type { InitializeChatResponse } from "./types";

interface BaseInitializationRequestBody {
  name: string;
  chatPrivacy: "public" | "private" | "team-edit" | "team" | "unlisted";
  projectId?: string;
}

interface FilesInitializationRequestBody extends BaseInitializationRequestBody {
  type: "files";
  files: FileContent[];
}

interface RepoInitializationRequestBody extends BaseInitializationRequestBody {
  type: "repo";
  repo: { url: string; branch?: string };
}

interface RegistryInitializationRequestBody extends BaseInitializationRequestBody {
  type: "registry";
  registry: { url: string };
}

interface ZipInitializationRequestBody extends BaseInitializationRequestBody {
  type: "zip";
  zip: { url: string };
}

interface TemplateInitializationRequestBody extends BaseInitializationRequestBody {
  type: "template";
  templateId: string;
}

type InitializationRequestBody =
  | FilesInitializationRequestBody
  | RepoInitializationRequestBody
  | RegistryInitializationRequestBody
  | ZipInitializationRequestBody
  | TemplateInitializationRequestBody;

interface FormValues {
  name: string;
  chatPrivacy: "public" | "private" | "team-edit" | "team" | "unlisted";
  projectId?: string;
  initializationType: "files" | "repo" | "registry" | "zip" | "template";
  files?: string[];
  repoUrl?: string;
  branch?: string;
  registryUrl?: string;
  zipUrl?: string;
  templateId?: string;
}

export default function Command() {
  const { push } = useNavigation();
  const { projects, isLoadingProjects } = useProjects();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();
  const { isLoadingScopes } = useScopes(activeProfileApiKey);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      name: "",
      chatPrivacy: "private",
      initializationType: "files",
      files: [],
      repoUrl: "",
      branch: "",
      registryUrl: "",
      zipUrl: "",
      templateId: "",
    },
    onSubmit: async (formValues) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.", {
          title: "Initialization Failed",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Initializing chat...",
      });

      try {
        let requestBody: InitializationRequestBody;

        if (formValues.initializationType === "files") {
          if (!formValues.files || formValues.files.length === 0) {
            throw new Error("At least one file or directory is required for file upload initialization.");
          }
          const filesContent = await readFilesFromPaths(formValues.files);
          requestBody = {
            name: formValues.name,
            chatPrivacy: formValues.chatPrivacy,
            ...(formValues.projectId && { projectId: formValues.projectId }),
            type: "files",
            files: filesContent,
          };
        } else if (formValues.initializationType === "repo") {
          if (!formValues.repoUrl) {
            throw new Error("Repo URL is required for repository initialization.");
          }
          requestBody = {
            name: formValues.name,
            chatPrivacy: formValues.chatPrivacy,
            ...(formValues.projectId && { projectId: formValues.projectId }),
            type: "repo",
            repo: {
              url: formValues.repoUrl,
              ...(formValues.branch && formValues.branch.length > 0 && { branch: formValues.branch }),
            },
          };
        } else if (formValues.initializationType === "registry") {
          if (!formValues.registryUrl) {
            throw new Error("Registry URL is required for registry initialization.");
          }
          requestBody = {
            name: formValues.name,
            chatPrivacy: formValues.chatPrivacy,
            ...(formValues.projectId && { projectId: formValues.projectId }),
            type: "registry",
            registry: {
              url: formValues.registryUrl,
            },
          };
        } else if (formValues.initializationType === "zip") {
          if (!formValues.zipUrl) {
            throw new Error("Zip URL is required for zip initialization.");
          }
          requestBody = {
            name: formValues.name,
            chatPrivacy: formValues.chatPrivacy,
            ...(formValues.projectId && { projectId: formValues.projectId }),
            type: "zip",
            zip: {
              url: formValues.zipUrl,
            },
          };
        } else if (formValues.initializationType === "template") {
          if (!formValues.templateId) {
            throw new Error("Template ID is required for template initialization.");
          }
          requestBody = {
            name: formValues.name,
            chatPrivacy: formValues.chatPrivacy,
            ...(formValues.projectId && { projectId: formValues.projectId }),
            type: "template",
            templateId: formValues.templateId,
          };
        } else {
          throw new Error("Invalid initialization type selected.");
        }

        const chatResponse = await v0ApiFetcher<InitializeChatResponse>("https://api.v0.dev/v1/chats/init", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "Content-Type": "application/json",
            "x-scope": activeProfileDefaultScope || "",
          },
          body: JSON.stringify(requestBody),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Chat Initialized";
        toast.message = "Your new chat has been initialized successfully!";

        // Navigate to the new chat messages view
        push(
          <ChatMessages
            chatId={chatResponse.id}
            apiKey={activeProfileApiKey}
            scopeId={activeProfileDefaultScope || ""}
          />,
        );
      } catch (error) {
        if (error instanceof V0ApiError) {
          showFailureToast(error.message, { title: "Initialization Failed" });
        } else {
          showFailureToast(`Failed to initialize chat: ${error instanceof Error ? error.message : String(error)}`, {
            title: "Initialization Failed",
          });
        }
        throw error;
      }
    },
    validation: { name: FormValidation.Required, initializationType: FormValidation.Required },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Initialize Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoadingProjects || isLoadingScopes || isLoadingProfileDetails}
    >
      <Form.Description text="Initialize a new chat from files or a URL." />

      <Form.TextField
        {...itemProps.name}
        title="Chat Name"
        placeholder="Enter a name for your chat"
        info="A descriptive name for your new chat."
      />

      <Form.Dropdown
        id="initializationType"
        title="Initialization Type"
        info="Select how you want to initialize the chat."
        value={values.initializationType}
        onChange={(newValue) => itemProps.initializationType.onChange?.(newValue as FormValues["initializationType"])}
      >
        <Form.Dropdown.Item value="files" title="File Upload" />
        <Form.Dropdown.Item value="repo" title="Github Repository" />
        <Form.Dropdown.Item value="registry" title="Registry" />
        <Form.Dropdown.Item value="zip" title="Zip File" />
        <Form.Dropdown.Item value="template" title="Community Template" />
      </Form.Dropdown>

      {values.initializationType === "files" && (
        <Form.FilePicker
          {...itemProps.files}
          title="Files"
          allowMultipleSelection
          canChooseDirectories
          canChooseFiles
          info="Select files to upload and initialize the chat. Directories will be scanned for files."
        />
      )}

      {values.initializationType === "repo" && (
        <>
          <Form.TextField
            {...itemProps.repoUrl}
            title="Repository URL"
            placeholder="https://github.com/owner/repo"
            info="The URL of the Git repository."
          />
          <Form.TextField
            {...itemProps.branch}
            title="Branch (Optional)"
            placeholder="main"
            info="The branch to use. Defaults to the default branch if not specified."
          />
        </>
      )}

      {values.initializationType === "registry" && (
        <Form.TextField
          {...itemProps.registryUrl}
          title="Registry URL"
          placeholder="https://example.com/registry.json"
          info="The URL to a registry JSON file."
        />
      )}

      {values.initializationType === "zip" && (
        <Form.TextField
          {...itemProps.zipUrl}
          title="Zip File URL"
          placeholder="https://example.com/archive.zip"
          info="The URL to a zip file."
        />
      )}

      {values.initializationType === "template" && (
        <Form.TextField
          {...itemProps.templateId}
          title="Template ID"
          placeholder="e.g. fMitqLVrOfR"
          info="Enter the v0 community Template ID to initialize from a template."
        />
      )}

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

      <Form.Dropdown
        id="chatPrivacy"
        title="Privacy"
        value={values.chatPrivacy}
        onChange={(newValue) => itemProps.chatPrivacy.onChange?.(newValue as FormValues["chatPrivacy"])}
      >
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="team" title="Team" />
        <Form.Dropdown.Item value="team-edit" title="Team (Editable)" />
        <Form.Dropdown.Item value="unlisted" title="Unlisted" />
      </Form.Dropdown>
    </Form>
  );
}
