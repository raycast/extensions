import { List, useNavigation } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import ConsoleView, { CommandType } from "./components/ConsoleView";
import { VersionItem } from "./components/VersionItem";
import { useController } from "./lib/controller";

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);
  const controller = useController();
  const navigation = useNavigation();

  const { error, isLoading } = controller;
  const { cache, versions, channels } = controller.data;

  const channelList = useMemo(() => {
    if (!channels) return [];
    return [channels!.stable, channels!.beta];
  }, [channels]);

  const results = useMemo(() => {
    return versions;
  }, [versions]);

  const onInstall = useCallback(async (version: string) => {
    navigation.push(
      <ConsoleView command={CommandType.Install} version={version} onCompletion={controller.revalidate.cache} />,
    );
  }, []);

  const onRemove = useCallback(async (version: string) => {
    navigation.push(
      <ConsoleView command={CommandType.Remove} version={version} onCompletion={controller.revalidate.cache} />,
    );
  }, []);

  const onSetup = useCallback(async (version: string) => {
    navigation.push(
      <ConsoleView command={CommandType.Setup} version={version} onCompletion={controller.revalidate.cache} />,
    );
  }, []);

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView title="Failed to load releases" />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      <List.Section title="Channels">
        {channelList.map((release) => {
          const isCached = cache?.versions?.find((v) => v.name === release.channel);
          return (
            <VersionItem
              cached={isCached}
              key={release.hash + release.channel}
              release={release}
              isChannel
              onShowDetail={() => setShowingDetail(!showingDetail)}
              onInstall={() => onInstall(release.channel)}
              onRemove={() => onRemove(release.channel)}
              onSetup={() => onSetup(release.channel)}
            />
          );
        })}
      </List.Section>
      <List.Section title="Cached Versions">
        {results?.map((release) => {
          const isCached = cache?.versions?.find((v) => v.name === release.version);

          return (
            <VersionItem
              key={release.channel + release.hash}
              release={release}
              onShowDetail={() => setShowingDetail(!showingDetail)}
              cached={isCached}
              isChannel={false}
              onInstall={() => onInstall(release.version)}
              onRemove={() => onRemove(release.version)}
              onSetup={() => onSetup(release.version)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
