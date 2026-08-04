import { Action, ActionPanel, environment, Icon, Keyboard, List, LocalStorage, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { PortListDetail } from "./PortListDetail";
import { SetupView } from "./SetupView";
import { DEMO_OUTPUT, DEMO_STORAGE_KEY } from "../lib/demo-ports";
import { portAccessories, portListIcon } from "../lib/format";
import type { Port } from "../lib/types";
import { fetchWhatCableOutput, WhatCableError } from "../lib/whatcable";

export type PortsFilter = "all" | "connected";

interface PortsCommandProps {
  filter: PortsFilter;
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
}

type PortsPayload = Awaited<ReturnType<typeof fetchWhatCableOutput>>;

function demoPayload(): PortsPayload {
  return {
    cliPath: "demo",
    output: DEMO_OUTPUT,
    raw: JSON.stringify(DEMO_OUTPUT, null, 2),
  };
}

export function PortsCommand({ filter, searchBarPlaceholder, emptyTitle, emptyDescription }: PortsCommandProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [useDemoData, setUseDemoData] = useState(false);
  const [demoReady, setDemoReady] = useState(!environment.isDevelopment);

  useEffect(() => {
    if (!environment.isDevelopment) {
      setDemoReady(true);
      return;
    }
    void LocalStorage.getItem<string>(DEMO_STORAGE_KEY).then((value) => {
      setUseDemoData(value === "1");
      setDemoReady(true);
    });
  }, []);

  const { isLoading, data, error, revalidate, mutate } = useCachedPromise(
    async (demo: boolean) => {
      if (environment.isDevelopment && demo) {
        return demoPayload();
      }
      return fetchWhatCableOutput();
    },
    [useDemoData],
    { keepPreviousData: true, execute: demoReady },
  );

  const refresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  const forceRedownload = useCallback(() => {
    void mutate(fetchWhatCableOutput({ forceDownload: true }));
  }, [mutate]);

  const enableDemoData = useCallback(() => {
    void LocalStorage.setItem(DEMO_STORAGE_KEY, "1");
    setUseDemoData(true);
  }, []);

  const disableDemoData = useCallback(() => {
    void LocalStorage.removeItem(DEMO_STORAGE_KEY);
    setUseDemoData(false);
  }, []);

  const ports = useMemo(() => {
    const all = data?.output.ports ?? [];
    if (filter === "connected") {
      return all.filter((port) => port.connectionActive);
    }
    return all;
  }, [data?.output.ports, filter]);

  const demoActions =
    environment.isDevelopment ? (
      useDemoData ? (
        <Action title="Use Live CLI Data" icon={Icon.Terminal} onAction={disableDemoData} />
      ) : (
        <Action
          title="Use Demo Data (Screenshots)"
          icon={Icon.Image}
          onAction={enableDemoData}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      )
    ) : null;

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

  if ((!data && isLoading) || !demoReady) {
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
            {demoActions}
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
          demoActions={demoActions}
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
  demoActions,
  onRefresh,
  onForceDownload,
}: {
  port: Port;
  isShowingDetail: boolean;
  rawJson: string;
  detailToggleAction: ReactNode;
  demoActions: ReactNode;
  onRefresh: () => void;
  onForceDownload: () => void;
}) {
  const accessories = portAccessories(port);
  return (
    <List.Item
      title={port.name}
      icon={portListIcon(port)}
      accessories={isShowingDetail ? accessories.filter((a) => a.tag) : accessories}
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
          {demoActions}
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
