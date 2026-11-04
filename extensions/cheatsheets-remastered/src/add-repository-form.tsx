import React from "react";
import { Form, confirmAlert, Alert, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import Service from "./service";

type AddRepositoryFormValues = {
  name: string;
  owner: string;
  description?: string;
  url?: string;
  isPrivate: boolean;
  defaultBranch: string;
  subdirectory?: string;
};

import { useDraftPersistence } from "./use-draft";

export function AddRepositoryForm({ onAdded }: { onAdded?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    value: name,
    isReady: nameReady,
    updateValue: updateName,
    clearDraft: clearNameDraft,
  } = useDraftPersistence<string>("add-repo-name", "");

  const {
    value: owner,
    isReady: ownerReady,
    updateValue: updateOwner,
    clearDraft: clearOwnerDraft,
  } = useDraftPersistence<string>("add-repo-owner", "");

  const {
    value: description,
    isReady: descriptionReady,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence<string>("add-repo-description", "");

  const {
    value: url,
    isReady: urlReady,
    updateValue: updateUrl,
    clearDraft: clearUrlDraft,
  } = useDraftPersistence<string>("add-repo-url", "");

  const {
    value: isPrivate,
    isReady: isPrivateReady,
    updateValue: updateIsPrivate,
    clearDraft: clearIsPrivateDraft,
  } = useDraftPersistence<boolean>("add-repo-private", false);

  const {
    value: defaultBranch,
    isReady: defaultBranchReady,
    updateValue: updateDefaultBranch,
    clearDraft: clearDefaultBranchDraft,
  } = useDraftPersistence<string>("add-repo-branch", "main");

  const {
    value: subdirectory,
    isReady: subdirectoryReady,
    updateValue: updateSubdirectory,
    clearDraft: clearSubdirectoryDraft,
  } = useDraftPersistence<string>("add-repo-subdir", "");

  const handleSubmit = async (values: AddRepositoryFormValues) => {
    try {
      if (!(
        nameReady &&
        ownerReady &&
        descriptionReady &&
        urlReady &&
        isPrivateReady &&
        defaultBranchReady &&
        subdirectoryReady
      ))
        throw new Error("Wait for saved drafts to load. If loading failed, preserve your text and reopen the form.");
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

      await Service.addUserRepository(
        values.name,
        values.owner,
        values.description,
        values.url,
        values.isPrivate,
        values.defaultBranch,
        values.subdirectory,
      );

      // Clear drafts after successful submission
      const draftsCleared = (
        await Promise.all([
          clearNameDraft(),
          clearOwnerDraft(),
          clearDescriptionDraft(),
          clearUrlDraft(),
          clearIsPrivateDraft(),
          clearDefaultBranchDraft(),
          clearSubdirectoryDraft(),
        ])
      ).every(Boolean);

      if (!draftsCleared)
        await showToast({
          style: Toast.Style.Failure,
          title: "Repository Added; Draft Retained",
          message: "Some draft fields could not be cleared. Check them before adding another repository.",
        });
      if (onAdded) {
        onAdded();
      }
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to add repository" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={
        isSubmitting ||
        !(
          nameReady &&
          ownerReady &&
          descriptionReady &&
          urlReady &&
          isPrivateReady &&
          defaultBranchReady &&
          subdirectoryReady
        )
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Repository" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action
            title="Reset Form"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                !(await confirmAlert({
                  title: "Discard Saved Draft?",
                  message: "This removes the saved draft for this form.",
                  primaryAction: { title: "Discard", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              const draftsCleared = (
                await Promise.all([
                  clearNameDraft(),
                  clearOwnerDraft(),
                  clearDescriptionDraft(),
                  clearUrlDraft(),
                  clearIsPrivateDraft(),
                  clearDefaultBranchDraft(),
                  clearSubdirectoryDraft(),
                ])
              ).every(Boolean);
              if (draftsCleared) showToast({ style: Toast.Style.Success, title: "Form Reset" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text="Add a GitHub repository to your collection. Specify owner/repo format, optional branch and subdirectory to filter cheatsheet files."
        title="Add GitHub Repository"
      />

      <Form.TextField
        id="name"
        title="Repository Name"
        placeholder="Enter repository name (e.g., 'my-awesome-project')"
        value={name}
        onChange={updateName}
        error={showErrors && !name.trim() ? "Repository name is required" : undefined}
      />

      <Form.TextField
        id="owner"
        title="Owner"
        placeholder="Enter owner/username (e.g., 'octocat')"
        value={owner}
        onChange={updateOwner}
        error={showErrors && !owner.trim() ? "Owner is required" : undefined}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter optional repository description"
        value={description}
        onChange={updateDescription}
      />

      <Form.TextField
        id="url"
        title="Repository URL"
        placeholder="Enter repository URL (optional, will auto-generate if empty)"
        value={url}
        onChange={updateUrl}
      />

      <Form.Checkbox id="isPrivate" label="Private Repository" value={isPrivate} onChange={updateIsPrivate} />

      <Form.TextField
        id="defaultBranch"
        title="Default Branch"
        placeholder="Enter default branch name (e.g., 'main', 'master')"
        value={defaultBranch}
        onChange={updateDefaultBranch}
      />

      <Form.TextField
        id="subdirectory"
        title="Subdirectory (Optional)"
        placeholder="Enter subdirectory path (e.g., 'docs', 'cheatsheets')"
        value={subdirectory}
        onChange={updateSubdirectory}
      />
    </Form>
  );
}

export default AddRepositoryForm;
