import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { BranchDropdown, CustomAgentsDropdown, IssueDropdown, RepositoryDropdown } from "./components";
import { ModelDropdown } from "./components/ModelDropdown";
import { useRepositoryMetadata } from "./hooks/useRepositoryMetadata";
import { useViewer } from "./hooks/useViewer";
import { provider, reauthorize } from "./lib/oauth";
import { assignIssueToCopilot } from "./services/copilot";

type FormValues = {
  repository: string;
  issue: string;
  branch: string;
  customAgent: string;
  model: string;
  additionalInstructions: string;
};

function Command() {
  const [isRepositoryLoading, setIsRepositoryLoading] = useState(false);
  const [isIssueLoading, setIsIssueLoading] = useState(false);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [isCustomAgentsLoading, setIsCustomAgentsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    validation: {
      repository: FormValidation.Required,
      issue: FormValidation.Required,
      branch: FormValidation.Required,
    },
    onSubmit: async (formValues) => {
      if (isSubmitting) {
        return;
      }

      if (!repositoryId || !copilotBotId) {
        const errorMessage = copilotBotId
          ? "Repository information is not available"
          : "Copilot coding agent is not available for this repository";
        await showFailureToast(new Error(errorMessage), {
          title: "Cannot assign issue",
        });
        return;
      }

      setIsSubmitting(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Assigning issue to Copilot",
      });

      try {
        await assignIssueToCopilot({
          issueId: formValues.issue,
          repositoryId,
          copilotBotId,
          baseRef: formValues.branch,
          customAgent: formValues.customAgent,
          model: formValues.model,
          additionalInstructions: formValues.additionalInstructions,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Issue assigned to Copilot",
        });

        await popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to assign issue" });
        setIsSubmitting(false);
      }
    },
  });

  const { repositoryId, copilotBotId } = useRepositoryMetadata(values.repository);
  const { data, isLoading: isViewerLoading } = useViewer();

  const isLoading =
    isViewerLoading ||
    isRepositoryLoading ||
    isIssueLoading ||
    isBranchLoading ||
    isCustomAgentsLoading ||
    isModelLoading ||
    isSubmitting;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Assign to Copilot" icon={Icon.Person} onSubmit={handleSubmit} />
          <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <RepositoryDropdown
        organizations={data?.organizations.nodes.map((org) => org.login)}
        itemProps={itemProps.repository}
        onLoadingChange={setIsRepositoryLoading}
      />
      <IssueDropdown
        key={values.repository}
        repository={values.repository}
        itemProps={itemProps.issue}
        onLoadingChange={setIsIssueLoading}
      />
      <BranchDropdown
        repository={itemProps.repository.value}
        itemProps={itemProps.branch}
        onLoadingChange={setIsBranchLoading}
      />
      <CustomAgentsDropdown
        repository={itemProps.repository.value}
        itemProps={itemProps.customAgent}
        onLoadingChange={setIsCustomAgentsLoading}
      />
      <ModelDropdown itemProps={itemProps.model} onLoadingChange={setIsModelLoading} />
      <Form.TextArea
        title="Additional Instructions"
        placeholder="Add any context, constraints, or specific requirements for Copilot"
        {...itemProps.additionalInstructions}
      />
    </Form>
  );
}

export default withAccessToken(provider)(Command);
