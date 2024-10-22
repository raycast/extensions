import { LocalStorage, LaunchProps, showToast, Toast, popToRoot } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import SearchResults from "./components/SearchResults";

import useInstances from "./hooks/useInstances";

import { Instance } from "./types";

export default function Search(props: LaunchProps) {
  const { instanceName, query } = props.arguments;
  const { instances } = useInstances();
  const [, setSelectedInstance] = useCachedState<Instance>("instance");

  if (instances.length === 0) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    popToRoot();
    return;
  }

  const instance = instances.find(
    (i: Instance) =>
      i.name.toLowerCase() === instanceName.toLowerCase() || i.alias?.toLowerCase() === instanceName.toLowerCase(),
  );
  if (!instance) {
    showToast(
      Toast.Style.Failure,
      "Instance not found",
      `No instance profile found with name or alias: ${instanceName}`,
    );
    popToRoot();
    return;
  }

  setSelectedInstance(instance);
  LocalStorage.setItem("selected-instance", JSON.stringify(instance));

  return <SearchResults searchTerm={query} />;
}
