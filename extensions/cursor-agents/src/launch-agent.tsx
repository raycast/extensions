import { Action, ActionPanel, Clipboard, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedState, useForm } from "@raycast/utils";
import { launchAgent, useModels } from "./cursor";
import { processImages, refreshMenuBar } from "./utils";

type Repository = {
  id: string;
  name: string;
  url: string;
};

type Values = {
  prompt: string;
  images?: string[];
  repository: string;
  ref?: string;
  model: string;
  autoCreatePR?: boolean;
  branchName?: string;
};

function AddRepositoryForm(props: { onAdd: (repository: Repository) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ url: string }>({
    validation: {
      url: (value) => {
        if (!value) {
          return "Repository URL is required";
        }
        if (!value?.startsWith("https://github.com/")) {
          return "Must be a GitHub repository";
        }
        return undefined;
      },
    },
    onSubmit: async (values) => {
      try {
        const repository: Repository = {
          id: Date.now().toString(),
          name: values.url.replace("https://github.com/", ""),
          url: values.url,
        };

        props.onAdd(repository);
        await showToast({
          style: Toast.Style.Success,
          title: "Repository added successfully",
        });
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to add repository" });
      }
    },
  });

  return (
    <Form
      navigationTitle="Add Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Repository URL"
        placeholder="https://github.com/owner/repo"
        info="Enter a GitHub repository URL"
        {...itemProps.url}
      />
    </Form>
  );
}

export default function Command() {
  const { data: models, isLoading } = useModels();
  const { push } = useNavigation();
  const [repositories, setRepositories] = useCachedState<Repository[]>("repositories", []);

  const addRepository = (repository: Repository) => {
    setRepositories([...repositories, repository]);
    // Set the newly added repository as selected
    setTimeout(() => {
      itemProps.repository.onChange?.(repository.url);
    }, 100);
  };

  const { handleSubmit, itemProps, reset, focus } = useForm<Values>({
    validation: {
      prompt: FormValidation.Required,
      images: (value) => {
        if (value && value.length > 5) {
          return "Only up to 5 images are supported";
        }

        if (value?.find((image) => !image.endsWith(".png") && !image.endsWith(".jpg") && !image.endsWith(".jpeg"))) {
          return "Only PNG, JPG, and JPEG images are supported";
        }

        return undefined;
      },
      repository: FormValidation.Required,
      ref: FormValidation.Required,
    },
    onSubmit: async (values) => {
      await showToast({ style: Toast.Style.Animated, title: "Launching background agent" });

      try {
        const response = await launchAgent({
          prompt: {
            text: values.prompt,
            images: processImages(values.images),
          },
          source: { repository: values.repository, ref: values.ref },
          model: values.model === "auto" ? undefined : values.model,
          target: {
            autoCreatePr: values.autoCreatePR,
            branchName: values.branchName === "" ? undefined : values.branchName,
          },
        });

        await refreshMenuBar();

        reset();
        focus("prompt");

        await showToast({
          style: Toast.Style.Success,
          title: "Launched background agent",
          primaryAction: {
            title: "Open URL",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            async onAction() {
              await open(response.target.url);
            },
          },
          secondaryAction: {
            title: "Copy URL",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            async onAction() {
              await Clipboard.copy(response.target.url);
            },
          },
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "";
        await showFailureToast(e, {
          title: "Failed launching background agent",
          message: errorMessage,
        });
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder="Enter a prompt" {...itemProps.prompt} />
      <Form.FilePicker
        title="Images"
        canChooseFiles
        allowMultipleSelection
        info="Only PNG, JPG, and JPEG images are supported"
        {...itemProps.images}
      />
      <Form.Separator />
      <Form.Dropdown
        title="Repository"
        storeValue
        {...itemProps.repository}
        onChange={(value) => {
          if (value === "__add_new__") {
            push(<AddRepositoryForm onAdd={addRepository} />);
            // Reset to previous value to avoid showing "__add_new__" as selected
            return;
          } else {
            itemProps.repository.onChange?.(value);
          }
        }}
      >
        {repositories.length === 0 ? (
          <Form.Dropdown.Item key="no-repos" value="" title="No repositories available" />
        ) : (
          repositories.map((repo) => <Form.Dropdown.Item key={repo.id} value={repo.url} title={repo.name} />)
        )}
        <Form.Dropdown.Section>
          <Form.Dropdown.Item key="add-new" value="__add_new__" title="Add Repository" icon={Icon.Plus} />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.TextField
        title="Ref"
        placeholder="Enter the base branch or tag."
        info="The branch or tag to work on, e.g. `main` or `v1.0.0`"
        storeValue
        {...itemProps.ref}
      />
      <Form.Separator />
      <Form.Description title="Advanced" text="Additional options for your background agents" />
      <Form.Dropdown title="Model" storeValue {...itemProps.model}>
        <Form.Dropdown.Section>
          <Form.Dropdown.Item key="auto" value="auto" title="Auto" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section>
          {models?.models.map((model) => (
            <Form.Dropdown.Item key={model} value={model} title={model} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.TextField
        title="Branch name"
        placeholder="Enter a branch name"
        info="Custom branch name for the agent to work on. If not provided, the agent will automatically create a branch."
        storeValue
        {...itemProps.branchName}
      />
      <Form.Checkbox label="Automatically create a PR when the agent is done" storeValue {...itemProps.autoCreatePR} />
    </Form>
  );
}
