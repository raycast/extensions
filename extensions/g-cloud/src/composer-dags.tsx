import { LaunchProps } from "@raycast/api";
import { HierarchyLauncher, isHierarchyContext } from "./services/composer";
import { DagList } from "./services/composer/views/dag-list";

export default function Command(props: LaunchProps) {
  if (isHierarchyContext(props.launchContext)) return <HierarchyLauncher context={props.launchContext} />;
  return <DagList root />;
}
