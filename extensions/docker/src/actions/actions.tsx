import {
  ActionPanelItem,
  closeMainWindow,
  Icon,
  KeyboardShortcut,
  popToRoot,
  preferences,
  showHUD,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import DockerContainer from "../dto/docker-container";
import DockerProject from "../dto/docker-project";
import { ActionContainerSuccessMessages, ActionProjectSuccessMessages } from "../enums/action-success-messages";

const execp = promisify(exec);

type ActionContainerProps = {
  container: DockerContainer;
  action: string;
  title: string;
  icon: Icon;
  shortcut: KeyboardShortcut | undefined;
};

type ActionProjectProps = {
  project: DockerProject;
  action: string;
  title: string;
  icon: Icon;
  shortcut: KeyboardShortcut | undefined;
};

export const DockerContainerAction = ({
  container,
  action,
  title,
  icon,
  shortcut,
  ...props
}: ActionContainerProps): JSX.Element => (
  <ActionPanelItem
    {...props}
    icon={icon}
    title={title}
    shortcut={shortcut}
    onAction={async () => {
      execContainerAction(container, action);
    }}
  />
);

export const DockerProjectAction = ({
  project,
  action,
  title,
  icon,
  shortcut,
  ...props
}: ActionProjectProps): JSX.Element => (
  <ActionPanelItem
    {...props}
    icon={icon}
    title={title}
    shortcut={shortcut}
    onAction={async () => {
      execProjectAction(project, action);
    }}
  />
);

export const execContainerAction = async (container: DockerContainer, action: string): Promise<void> => {
  showToast(ToastStyle.Animated, `Performing action`, "...");

  try {
    const dockerCliPath = preferences.dockerCliPath.value as string;
    const r = await execp(`${dockerCliPath} ${action} ${container.Names}`);
  } catch (e) {
    showToast(ToastStyle.Failure, `Error!`, `There was a error performing this action: ${action}`);
  } finally {
    showHUD(getContainerActionSuccessMessage(action));
    setTimeout(() => {
      closeMainWindow({ clearRootSearch: true });
    }, 500);
  }
};

export const execProjectAction = async (project: DockerProject, action: string): Promise<void> => {
  const toast = new Toast({ style: ToastStyle.Animated, title: `Performing this action: ${action}` });
  toast.show();

  try {
    const dockerCliPath = preferences.dockerCliPath.value as string;
    await execp(`cd ${project.WorkingDir} && ${dockerCliPath} compose ${action}`);
  } catch (e) {
    showToast(ToastStyle.Failure, `Error!`, `There was a error performing this action: ${action}`);

    toast.style = ToastStyle.Failure;
    toast.title = "Error!";
    toast.message = `There was a error performing this action: ${action}`;
    toast.show();
  } finally {
    toast.style = ToastStyle.Success;
    toast.title = "Succes!";
    toast.message = getProjectActionSuccessMessage(action);
    toast.show();

    setTimeout(() => {
      toast.hide();
      popToRoot();
      closeMainWindow({ clearRootSearch: true });
    }, 500);
  }
};

const getContainerActionSuccessMessage = (action: string) => {
  return action && ActionContainerSuccessMessages[action as keyof typeof ActionContainerSuccessMessages];
};

const getProjectActionSuccessMessage = (action: string) => {
  return action && ActionProjectSuccessMessages[action as keyof typeof ActionProjectSuccessMessages];
};
