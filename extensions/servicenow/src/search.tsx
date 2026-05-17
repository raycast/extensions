import { useEffect } from "react";
import { LaunchProps, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";

import SearchList from "./components/SearchList";
import SearchResults from "./components/SearchResults";
import useInstances from "./hooks/useInstances";
import { Instance } from "./types";

export default function Search(props: LaunchProps) {
  const { instanceName, query: argQuery } = props.arguments ?? {};
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const query = argQuery?.trim() || null;

  useEffect(() => {
    if (isLoadingInstances) return;
    if (instances.length === 0) {
      showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
      popToRoot();
      return;
    }
    if (instanceName) {
      const found = instances.find(
        (i: Instance) =>
          i.name.toLowerCase().includes(instanceName.toLowerCase()) ||
          i.alias?.toLowerCase().includes(instanceName.toLowerCase()),
      );
      if (found && found.id !== selectedInstance?.id) {
        setSelectedInstance(found);
        LocalStorage.setItem("selected-instance", JSON.stringify(found));
      } else if (!found) {
        showToast(
          Toast.Style.Failure,
          "Instance not found",
          `No instance found with URL or alias containing ${instanceName}`,
        );
      }
    }
  }, [isLoadingInstances]);

  if (query) return <SearchResults searchTerm={query} />;
  return <SearchList />;
}
