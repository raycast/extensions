import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getInstancesPath } from "../utils/prism";

export default function NoInstall() {
  const { data: instancesPath } = usePromise(getInstancesPath, []);

  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={"Prism Launcher is not installed"}
      description={`Prism Launcher not installed or ${instancesPath} is not present`}
    />
  );
}
