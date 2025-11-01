import { Action, ActionPanel, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { triggerBuild } from "../api/trigger-build";

interface WorkflowSelectorProps {
  appName: string;
  appId: string;
  workflows: { _id: string; name: string }[];
  branches: string[];
  defaultBranch: string;
}

function WorkflowSelector({ workflows, appName, branches, defaultBranch, appId }: WorkflowSelectorProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0]._id);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);

  const handleSubmit = async () => {
    try {
      const toast = await showToast(Toast.Style.Animated, "Triggering build...");
      await triggerBuild({
        appId,
        workflowId: selectedWorkflow,
        branch: selectedBranch,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Build triggered successfully!";
      await showHUD("Build started");
      popToRoot();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to trigger build", String(error));
    }
  };

  return (
    <Form
      navigationTitle={appName}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Trigger Build" onSubmit={handleSubmit} icon={Icon.Check} />
          {workflows.map((workflow) => (
            <Action.OpenInBrowser
              key={workflow._id}
              title={`Open ${workflow.name} Settings`}
              url={`https://codemagic.io/app/${appId}/workflow/${workflow._id}/settings`}
            />
          ))}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workflow" title="Workflow" value={selectedWorkflow} onChange={setSelectedWorkflow}>
        {workflows.map((workflow) => (
          <Form.Dropdown.Item key={workflow._id} value={workflow._id} title={workflow.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="branch" title="Branch" value={selectedBranch} onChange={setSelectedBranch}>
        {branches.map((branch) => (
          <Form.Dropdown.Item key={branch} value={branch} title={branch} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default WorkflowSelector;
