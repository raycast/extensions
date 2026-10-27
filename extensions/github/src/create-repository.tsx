import {
  Action,
  ActionPanel,
  captureException,
  Clipboard,
  Form,
  Icon,
  Image,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";

import { getGitHubClient } from "./api/githubClient";
import { createRepository, getCloneUrl } from "./helpers/create-repository";
import { getErrorMessage } from "./helpers/errors";
import { withGitHubClient } from "./helpers/withGithubClient";

type RepositoryFormValues = {
  name: string;
  description: string;
  isPrivate: boolean;
  owner: string;
  autoInit: boolean;
};

function RepositoryForm() {
  const { octokit } = getGitHubClient();

  const { data: owners, isLoading } = useCachedPromise(
    async () => {
      const [{ data: viewer }, organizations] = await Promise.all([
        octokit.users.getAuthenticated(),
        octokit.paginate(octokit.orgs.listForAuthenticatedUser, { per_page: 100 }),
      ]);

      return {
        viewer: { login: viewer.login, avatarUrl: viewer.avatar_url },
        organizations: organizations.map((org) => ({ login: org.login, avatarUrl: org.avatar_url })),
      };
    },
    [],
    {
      onError(error) {
        showToast({ style: Toast.Style.Failure, title: "Failed loading owners", message: getErrorMessage(error) });
      },
    },
  );

  const { handleSubmit, itemProps, values, setValue, reset, focus } = useForm<RepositoryFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating repository" });

      try {
        const repository = await createRepository({
          name: values.name.trim(),
          description: values.description.trim(),
          isPrivate: values.isPrivate,
          owner: values.owner,
          autoInit: values.autoInit,
        });

        toast.style = Toast.Style.Success;
        toast.title = `Created ${repository.full_name}`;
        toast.primaryAction = {
          title: "Open in Browser",
          shortcut: { modifiers: ["shift", "cmd"], key: "o" },
          onAction: () => open(repository.html_url),
        };
        toast.secondaryAction = {
          title: "Copy Clone URL",
          shortcut: { modifiers: ["shift", "cmd"], key: "c" },
          onAction: () => Clipboard.copy(getCloneUrl(repository)),
        };

        reset({ name: "", description: "", isPrivate: values.isPrivate, owner: values.owner, autoInit: false });
        focus("name");
      } catch (error) {
        captureException(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed creating repository";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: {
      name: "",
      description: "",
      isPrivate: true,
      owner: "",
      autoInit: false,
    },
    validation: {
      name: FormValidation.Required,
      owner: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (owners && !values.owner) {
      setValue("owner", owners.viewer.login);
    }
  }, [owners?.viewer.login]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Repository" icon={Icon.Plus} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Dropdown title="Owner" isLoading={isLoading} {...itemProps.owner}>
        {owners ? (
          <>
            <Form.Dropdown.Item
              title={owners.viewer.login}
              value={owners.viewer.login}
              icon={{ source: owners.viewer.avatarUrl, mask: Image.Mask.Circle }}
            />
            {owners.organizations.length > 0 ? (
              <Form.Dropdown.Section title="Organizations">
                {owners.organizations.map((org) => (
                  <Form.Dropdown.Item
                    key={org.login}
                    title={org.login}
                    value={org.login}
                    icon={{ source: org.avatarUrl, mask: Image.Mask.Circle }}
                  />
                ))}
              </Form.Dropdown.Section>
            ) : null}
          </>
        ) : null}
      </Form.Dropdown>

      <Form.TextField title="Name" placeholder="my-new-repository" autoFocus {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Optional description" {...itemProps.description} />

      <Form.Separator />

      <Form.Checkbox
        label="Private"
        info="Only you and people you share it with can see a private repository"
        {...itemProps.isPrivate}
      />

      <Form.Checkbox
        label="Initialize with a README"
        info="Creates an initial commit so the repository can be cloned right away"
        {...itemProps.autoInit}
      />
    </Form>
  );
}

export default withGitHubClient(RepositoryForm);
