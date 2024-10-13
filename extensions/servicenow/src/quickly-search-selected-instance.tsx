import { LaunchProps, LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import SearchResults from "./components/SearchResults";

import useInstances from "./hooks/useInstances";

import { Instance } from "./types";

export default function quicklySearchSelectedInstance(props: LaunchProps) {
  const { query } = props.arguments;
  const instanceName = props.launchContext?.instanceName;
  const { instances } = useInstances();
  const [, setSelectedInstance] = useCachedState<Instance>("instance");

  if (instanceName) {
    const instance = instances.find(
      (i: Instance) =>
        i.name.toLowerCase() === instanceName.toLowerCase() || i.alias?.toLowerCase() === instanceName.toLowerCase(),
    );
    if (instance) {
      setSelectedInstance(instance);
      LocalStorage.setItem("selected-instance", JSON.stringify(instance));
    }
  }
  return <SearchResults searchTerm={query} />;
}
