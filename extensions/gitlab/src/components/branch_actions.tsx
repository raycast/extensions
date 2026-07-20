import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { gitlab } from "../common";
import { Branch, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { ProjectCommitList } from "./commits/list";
import { MRCreateForm } from "./mr_create";

function branchApiPath(projectId: number, branchName: string): string {
  return `projects/${projectId}/repository/branches/${encodeURIComponent(branchName)}`;
}

function BranchNameForm(props: {
  navigationTitle: string;
  fieldTitle: string;
  defaultValue?: string;
  placeholder?: string;
  submitTitle: string;
  confirmTitle: string;
  confirmMessage: (branchName: string) => string;
  destructive?: boolean;
  onSubmit: (branchName: string) => Promise<void>;
  onFinished?: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: { branch_name: string }) {
    const branchName = values.branch_name.trim();
    if (branchName === "") {
      throw Error("Please enter a branch name");
    }
    if (
      !(await confirmAlert({
        title: props.confirmTitle,
        message: props.confirmMessage(branchName),
        primaryAction: {
          title: props.submitTitle,
          style: props.destructive ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: `${props.submitTitle}...` });
      await props.onSubmit(branchName);
      await showToast(Toast.Style.Success, props.submitTitle, "Done");
      props.onFinished?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: `Cannot ${props.submitTitle.toLowerCase()}` });
    }
  }

  return (
    <Form
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.submitTitle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="branch_name"
        title={props.fieldTitle}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        autoFocus
      />
    </Form>
  );
}

export function CreateMRAction(props: { project: Project; branch: Branch }) {
  if (props.project.default_branch === props.branch.name) {
    return null;
  }
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Merge Request"
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      target={<MRCreateForm project={props.project} branch={props.branch.name} />}
    />
  );
}

export function ShowBranchCommitsAction(props: { project: Project; branch: Branch }) {
  return (
    <Action.Push
      title="Show Commits"
      icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }}
      target={<ProjectCommitList project={props.project} refName={props.branch.name} />}
    />
  );
}

export function CreateBranchAction(props: { project: Project; branch: Branch; onFinished?: () => void }) {
  return (
    <Action.Push
      title="Create Branch"
      icon={{ source: Icon.Plus, tintColor: Color.Green }}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={
        <BranchNameForm
          navigationTitle="Create Branch"
          fieldTitle="Branch Name"
          placeholder="Enter new branch name"
          submitTitle="Create Branch"
          confirmTitle="Create Branch?"
          confirmMessage={(branchName) =>
            `Create branch "${branchName}" from "${props.branch.name}" in ${props.project.name_with_namespace}?`
          }
          onSubmit={async (branchName) => {
            await gitlab.post(
              `projects/${props.project.id}/repository/branches?branch=${encodeURIComponent(branchName)}&ref=${encodeURIComponent(props.branch.name)}`,
            );
          }}
          onFinished={props.onFinished}
        />
      }
    />
  );
}

export function RenameBranchAction(props: { project: Project; branch: Branch; onFinished?: () => void }) {
  return (
    <Action.Push
      title="Rename Branch"
      icon={{ source: Icon.Pencil, tintColor: Color.Yellow }}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={
        <BranchNameForm
          navigationTitle="Rename Branch"
          fieldTitle="Branch Name"
          defaultValue={props.branch.name}
          submitTitle="Rename Branch"
          confirmTitle="Rename Branch?"
          confirmMessage={(branchName) => `Rename branch "${props.branch.name}" to "${branchName}"?`}
          onSubmit={async (branchName) => {
            await gitlab.put(branchApiPath(props.project.id, props.branch.name), { name: branchName });
          }}
          onFinished={props.onFinished}
        />
      }
    />
  );
}

export function RemoveBranchAction(props: { project: Project; branch: Branch; onFinished?: () => void }) {
  if (props.branch.default) {
    return null;
  }
  async function handle() {
    if (
      !(await confirmAlert({
        title: "Delete Branch?",
        message: `Delete branch "${props.branch.name}"? This cannot be undone.`,
        primaryAction: { title: "Delete Branch", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting branch..." });
      await gitlab.delete(branchApiPath(props.project.id, props.branch.name));
      await showToast(Toast.Style.Success, "Deleted branch");
      props.onFinished?.();
    } catch (error) {
      await showFailureToast(error, { title: "Cannot delete branch" });
    }
  }
  return (
    <Action
      title="Delete Branch"
      style={Action.Style.Destructive}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={handle}
    />
  );
}
