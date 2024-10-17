import { LaunchProps, popToRoot, showToast, Toast } from "@raycast/api";

import SearchResults from "./components/SearchResults";

import useInstances from "./hooks/useInstances";

export default function quicklySearchSelectedInstance(props: LaunchProps) {
  const { query } = props.arguments;
  const { instances } = useInstances();

  if (instances.length === 0) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    popToRoot();
    return;
  }

  return <SearchResults searchTerm={query} />;
}
