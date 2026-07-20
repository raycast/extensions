import { List, Action, ActionPanel, openExtensionPreferences } from "@raycast/api";

interface DeviceEmptyViewProps {
  androidSdkFound: boolean;
  isLoading: boolean;
  isSearching: boolean;
  selectedCategory: string;
  xcodeFound: boolean;
  onRefresh: () => void;
}

export function DeviceEmptyView({
  androidSdkFound,
  isLoading = false,
  isSearching = false,
  selectedCategory = "all",
  xcodeFound,
  onRefresh,
}: DeviceEmptyViewProps) {
  const deviceDescriptions: { [key: string]: string } = {
    ios: "iOS simulators",
    android: "Android emulators",
    all: "simulators and emulators",
  };

  const description = deviceDescriptions[selectedCategory] || deviceDescriptions.all;

  if (isLoading) {
    return <List.EmptyView icon="⏳" title="Loading Devices" description={`Searching for ${description}...`} />;
  }

  if (isSearching) {
    return <List.EmptyView icon="🔍" title="No Matching Devices" description="Try adjusting your search query" />;
  }

  if (selectedCategory === "android" && !androidSdkFound) {
    return (
      <List.EmptyView
        icon="⚠️"
        title="No Android Emulators Found"
        description="Please verify that Android Studio is installed and properly configured. You can set the Android SDK path in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (selectedCategory === "ios" && !xcodeFound) {
    return (
      <List.EmptyView
        icon="⚠️"
        title="No iOS Simulators Found"
        description="Please verify that Xcode is installed and properly configured. You can adjust Xcode settings in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon="📱"
      title="No Devices Found"
      description={`No ${description} were found.`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
