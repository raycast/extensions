// "Cloud Composer" command: environments in the selected project (switchable from the dropdown).
// Also the deeplink / quicklink target, e.g.
//   raycast://extensions/<owner>/g-cloud/composer?launchContext={"env":"my-env","dag":"my_dag"}

import { LaunchProps } from "@raycast/api";
import { EnvironmentsList, HierarchyLauncher, isHierarchyContext } from "./services/composer";

export default function Command(props: LaunchProps) {
  if (isHierarchyContext(props.launchContext)) return <HierarchyLauncher context={props.launchContext} />;
  return <EnvironmentsList root />;
}
