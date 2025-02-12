import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { CachedVersionItem } from "./components/CachedVersionItem";
import ConsoleView, { CommandType } from "./components/ConsoleView";
import { useController } from "./lib/controller";

export default function Command() {
  const { data, isLoading, revalidate } = useController();
  const [showingDetail, setShowingDetail] = useState(false);
  const navigation = useNavigation();

  const onRemove = useCallback(async (version: string) => {
    navigation.push(<ConsoleView command={CommandType.Remove} version={version} onCompletion={revalidate.cache} />);
  }, []);

  const onSetup = useCallback(async (version: string) => {
    navigation.push(<ConsoleView command={CommandType.Setup} version={version} onCompletion={revalidate.cache} />);
  }, []);

  if (data.cache?.versions.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="No Flutter SDKs Installed"
          description="To see your Flutter SDK versions here, You first need to install a Flutter SDK using FVM."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate.cache()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {data.cache?.versions.map((version) => (
        <CachedVersionItem
          key={version.name}
          version={version}
          onSetup={() => onSetup(version.name)}
          onRemove={() => onRemove(version.name)}
          onShowDetail={() => setShowingDetail(!showingDetail)}
        />
      ))}
    </List>
  );
}
