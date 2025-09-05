import React from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import Service, { UserRepository } from "./service";

type EditRepositoryFormValues = {
  name: string;
  owner: string;
  description?: string;
  url?: string;
  defaultBranch: string;
  subdirectory?: string;
};

export function EditRepositoryForm({ repo, onUpdated }: { repo: UserRepository; onUpdated?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [formData, setFormData] = useState({
    name: repo.name,
    owner: repo.owner,
    description: repo.description || "",
    url: repo.url,
    defaultBranch: repo.defaultBranch,
    subdirectory: repo.subdirectory || "",
  });

  const handleSubmit = async (values: EditRepositoryFormValues) => {
    try {
      setIsSubmitting(true);
      setShowErrors(true);

      // Client-side validation
      if (!values.name?.trim() || !values.owner?.trim()) {
        setIsSubmitting(false);
        return;
      }

      // Validate GitHub repository format
      const validation = Service.validateGitHubRepository(values.owner, values.name);
      if (!validation.isValid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Repository Format",
          message: validation.error,
        });
        setIsSubmitting(false);
        return;
      }

      await Service.updateUserRepository(repo.id, {
        name: values.name.trim(),
        owner: values.owner.trim(),
        description: values.description?.trim() || undefined,
        url: values.url?.trim() || undefined,
        defaultBranch: values.defaultBranch.trim(),
        subdirectory: values.subdirectory?.trim() || undefined,
      });

      if (onUpdated) {
        onUpdated();
      }
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to update repository" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Repository" onSubmit={handleSubmit} icon={Icon.Check} />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        text="Edit the repository details. Changes will be saved to your local repository list."
        title="Edit Repository"
      />

      <Form.TextField
        id="name"
        title="Repository Name"
        placeholder="Enter repository name"
        value={formData.name}
        onChange={(value) => setFormData({ ...formData, name: value })}
        error={showErrors && !formData.name?.trim() ? "Repository name is required" : undefined}
      />

      <Form.TextField
        id="owner"
        title="Owner"
        placeholder="Enter owner/username"
        value={formData.owner}
        onChange={(value) => setFormData({ ...formData, owner: value })}
        error={showErrors && !formData.owner?.trim() ? "Owner is required" : undefined}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter repository description"
        value={formData.description}
        onChange={(value) => setFormData({ ...formData, description: value })}
      />

      <Form.TextField
        id="url"
        title="Repository URL"
        placeholder="Enter repository URL"
        value={formData.url}
        onChange={(value) => setFormData({ ...formData, url: value })}
      />

      <Form.TextField
        id="defaultBranch"
        title="Default Branch"
        placeholder="Enter default branch name"
        value={formData.defaultBranch}
        onChange={(value) => setFormData({ ...formData, defaultBranch: value })}
      />

      <Form.TextField
        id="subdirectory"
        title="Subdirectory (Optional)"
        placeholder="Enter subdirectory path (e.g., 'docs', 'cheatsheets')"
        value={formData.subdirectory}
        onChange={(value) => setFormData({ ...formData, subdirectory: value })}
      />
    </Form>
  );
}

export default EditRepositoryForm;
