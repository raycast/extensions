import { Detail, LaunchProps, getPreferenceValues, List } from "@raycast/api";
import { useMemo } from "react";
import ListView from "./components/ListView";
import { useList } from "./hooks/useList";
import { GoogleAuthProvider } from "./contexts/GoogleAuthProvider";

interface Preferences {
  defaultListName: string;
}

function OpenListCommand(props: LaunchProps<{ arguments: Arguments.OpenList }>) {
  const preferences = getPreferenceValues<Preferences>();
  const targetListName = useMemo(
    () => props.arguments.listName || preferences.defaultListName,
    [props.arguments.listName, preferences.defaultListName],
  );
  const { isLoading, list, error } = useList(targetListName);

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (error || !list) {
    return (
      <List>
        <List.EmptyView
          icon="😢"
          title={error?.title || "Unexpected Error"}
          description={error?.message || "Unable to load the list"}
        />
      </List>
    );
  }

  return <ListView listId={list.id} />;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenList }>) {
  return (
    <GoogleAuthProvider>
      <OpenListCommand {...props} />
    </GoogleAuthProvider>
  );
}
