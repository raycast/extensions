import { LaunchProps } from "@raycast/api";
import TaskManagementView from "./views/lists/TaskManagementView";

export default function Command(p: LaunchProps) {
  return <TaskManagementView launchProps={p} />;
}
