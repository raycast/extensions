import { useEffect } from "react";
import { LaunchProps, LocalStorage, popToRoot, showToast } from "@raycast/api";

import SearchList from "./components/SearchList";
import SearchResults from "./components/SearchResults";
import useInstances from "./hooks/useInstances";
import { matchInstance, notFoundToast, NO_PROFILES_TOAST } from "./utils/instanceResolver";

export default function Search(props: LaunchProps) {
  const { instanceName, query: argQuery } = props.arguments ?? {};
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const query = argQuery?.trim() || null;

  useEffect(() => {
    if (isLoadingInstances) return;
    if (instances.length === 0) {
      showToast(NO_PROFILES_TOAST);
      popToRoot();
      return;
    }
    if (instanceName) {
      const found = matchInstance(instances, instanceName);
      if (found && found.id !== selectedInstance?.id) {
        setSelectedInstance(found);
        LocalStorage.setItem("selected-instance", JSON.stringify(found));
      } else if (!found) {
        showToast(notFoundToast(instanceName));
      }
    }
  }, [isLoadingInstances]);

  if (query) return <SearchResults searchTerm={query} />;
  return <SearchList />;
}
