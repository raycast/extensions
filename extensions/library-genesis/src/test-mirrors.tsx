import { useMemo } from "react";

import type { Image } from "@raycast/api";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { useTimingFetch } from "./hooks/use-timing-fetch";
import { mirrors } from "./utils/api/mirrors";

const MirrorItem = ({ mirror }: { mirror: string }) => {
  const { data, error, isLoading } = useTimingFetch(`${mirror}/json.php?ids=1&fields=*`);

  const subTitle = useMemo(() => {
    if (isLoading || !data || !data.startTime || !data.endTime) {
      return "";
    }
    return `${data.endTime - data.startTime}ms`;
  }, [data, isLoading]);

  const icon = useMemo<Image>(() => {
    if (error) {
      return {
        source: Icon.XMarkCircle,
        tintColor: "red",
        tooltip: error.message,
      };
    }
    if (isLoading) {
      return {
        source: Icon.CircleProgress,
        tintColor: "gray",
      };
    }
    return {
      source: Icon.CheckCircle,
      tintColor: "green",
    };
  }, [error, isLoading]);

  return (
    <List.Item
      title={mirror}
      subtitle={subTitle}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={mirror} />
          <Action.CopyToClipboard title="Copy Mirror URL" content={mirror} />
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  const mirrorList = useMemo(() => mirrors.map((mirror) => mirror.baseUrl), []);

  return (
    <List searchBarPlaceholder={"Test mirrors"}>
      {mirrorList.map((mirror) => (
        <MirrorItem key={mirror} mirror={mirror} />
      ))}
    </List>
  );
}
