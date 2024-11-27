import { launchCommand, LaunchType } from "@raycast/api";

export async function navigateToAddProject() {
  await launchCommand({
    name: "addProject",
    type: LaunchType.UserInitiated,
  });
}

export async function navigateToManageProject() {
  await launchCommand({
    name: "manageProject",
    type: LaunchType.UserInitiated,
  });
}

export async function navigateToManageServer() {
  await launchCommand({
    name: "manageServer",
    type: LaunchType.UserInitiated,
  });
}
