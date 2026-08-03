import { Action, ActionPanel, Color, Icon, Keyboard, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { PortListDetail } from "./PortListDetail";
import { SetupView } from "./SetupView";
import { portAccessories } from "../lib/format";
import type { Port } from "../lib/types";
import { fetchWhatCableOutput, WhatCableError } from "../lib/whatcable";

export type PortsFilter = "all" | "connected";

interface PortsCommandProps {
  filter: PortsFilter;
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function PortsCommand({ filter, searchBarPlaceholder, emptyTitle, emptyDescription }: PortsCommandProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const { isLoading, data, error, revalidate, mutate } = useCachedPromise(async () => fetchWhatCableOutput(), [], {
    keepPreviousData: true,
  });

  const refresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  const forceRedownload = useCallback(() => {
    void mutate(fetchWhatCableOutput({ forceDownload: true }));
  }, [mutate]);

  const ports = useMemo(() => {
    const all = data?.output.ports ?? [];
    if (filter === "connected") {
      return all.filter((port) => port.connectionActive);
    }
    return all;
  }, [data?.output.ports, filter]);

  if (error && !data) {
    const message =
      error instanceof WhatCableError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Something went wrong while loading port data.";

    return (
      <SetupView
        title="USB-C Inspector"
        isLoading={isLoading}
        markdown={`# Could not load ports\n\n${message}\n\nIf this is the first launch, check your network connection so the official CLI can be downloaded from GitHub Releases.`}
        onRetry={refresh}
        onForceDownload={forceRedownload}
      />
    );
  }

  if (!data && isLoading) {
    return (
      <SetupView
        title="USB-C Inspector"
        isLoading
        markdown={`# Preparing USB-C Inspector\n\nLooking for a local CLI, or downloading the official notarized WhatCable binary from GitHub Releases.\n\nThis only happens once (unless you re-download).`}
      />
    );
  }

  const detailToggleAction = isShowingDetail ? (
    <Action title="Hide Details" icon={Icon.EyeDisabled} onAction={() => setIsShowingDetail(false)} />
  ) : (
    <Action title="Show Details" icon={Icon.Eye} onAction={() => setIsShowingDetail(true)} />
  );

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder={searchBarPlaceholder}>
      <List.EmptyView
        icon={Icon.Plug}
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action title="Re-Download CLI" icon={Icon.Download} onAction={forceRedownload} />
          </ActionPanel>
        }
      />
      {ports.map((port) => (
        <PortListItem
          key={`${port.name}-${port.className ?? ""}`}
          port={port}
          isShowingDetail={isShowingDetail}
          rawJson={data?.raw ?? ""}
          detailToggleAction={detailToggleAction}
          onRefresh={refresh}
          onForceDownload={forceRedownload}
        />
      ))}
    </List>
  );
}

function PortListItem({
  port,
  isShowingDetail,
  rawJson,
  detailToggleAction,
  onRefresh,
  onForceDownload,
}: {
  port: Port;
  isShowingDetail: boolean;
  rawJson: string;
  detailToggleAction: ReactNode;
  onRefresh: () => void;
  onForceDownload: () => void;
}) {
  return (
    <List.Item
      title={port.name}
      icon={{
        source: port.connectionActive ? Icon.Plug : Icon.Circle,
        tintColor: port.charging?.isWarning ? Color.Orange : port.connectionActive ? Color.Green : Color.SecondaryText,
      }}
      accessories={isShowingDetail ? portAccessories(port).filter((a) => a.tag) : portAccessories(port)}
      detail={<PortListDetail port={port} />}
      actions={
        <ActionPanel>
          {detailToggleAction}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.CopyToClipboard
            title="Copy Port JSON"
            content={JSON.stringify(port, null, 2)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Full JSON" content={rawJson} />
          <Action title="Re-Download CLI" icon={Icon.Download} onAction={onForceDownload} />
          <Action
            title="Open WhatCable on GitHub"
            icon={Icon.Globe}
            onAction={() => open("https://github.com/darrylmorley/whatcable")}
          />
        </ActionPanel>
      }
    />
  );
}
