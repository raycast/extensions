import {
  ActionPanel,
  Action,
  showToast,
  openCommandPreferences,
  LocalStorage,
} from "@raycast/api";

interface UpdateCredentialsActionProps {
  fetchData: () => void;
}

export function UpdateCredentialsAction({
  fetchData,
}: UpdateCredentialsActionProps) {
  function clearSessionId() {
    LocalStorage.removeItem("sessionId");
    openCommandPreferences();
    showToast({
      title: "Session ID cleared",
      message: "Please update your credentials",
    });
  }

  function refreshData() {
    fetchData();
    showToast({
      title: "Data refreshed",
      message: "Data has been refreshed",
    });
  }

  return (
    <ActionPanel>
      <Action title="Refresh" onAction={refreshData} />
      <Action title="Update Credentials" onAction={clearSessionId} />
    </ActionPanel>
  );
}
