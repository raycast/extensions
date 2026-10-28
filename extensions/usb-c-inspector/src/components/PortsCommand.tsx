import { Action, ActionPanel, environment, Icon, Keyboard, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { PortListDetail } from "./PortListDetail";
import { DEMO_OUTPUT, DEMO_STORAGE_KEY } from "../lib/demo-ports";
import { comparePorts, portAccessories, portListIcon, portListTitle } from "../lib/format";
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

const WHATCABLE_REPO_URL = "https://github.com/darrylmorley/whatcable";
const WHATCABLE_RELEASES_URL = "https://github.com/darrylmorley/whatcable/releases";

function demoPayload(): PortsPayload {
  return {
    cliPath: "demo",
    output: DEMO_OUTPUT,
    raw: JSON.stringify(DEMO_OUTPUT, null, 2),
  };
}

function filterPorts(ports: Port[], filter: PortsFilter): Port[] {
  switch (filter) {
    case "all":
      return ports;
    case "connected":
      return ports.filter((port) => port.connectionActive);
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof WhatCableError || error instanceof Error) {
    return error.message;
  }
  return "Something went wrong while loading port data.";
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
    return filterPorts(data?.output.ports ?? [], filter)
      .slice()
      .sort(comparePorts);
  }, [data?.output.ports, filter]);

  const demoActions = environment.isDevelopment ? (
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

  const retryActions = (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      <Action title="Re-Download CLI" icon={Icon.Download} onAction={forceRedownload} />
      {demoActions}
      <Action.OpenInBrowser title="Open WhatCable Releases" url={WHATCABLE_RELEASES_URL} />
      <Action.OpenInBrowser title="Open WhatCable on GitHub" url={WHATCABLE_REPO_URL} />
    </ActionPanel>
  );

  if (error && !data) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Ports"
          description={`${errorMessage(error)} If this is the first launch, check your network so the official CLI can download from GitHub Releases.`}
          actions={retryActions}
        />
      </List>
    );
  }

  if ((!data && isLoading) || !demoReady) {
    return (
      <List isLoading searchBarPlaceholder={searchBarPlaceholder}>
        <List.EmptyView
          icon={Icon.Download}
          title="Preparing USB-C Inspector"
          description="Looking for a local CLI, or downloading the official WhatCable binary from GitHub Releases. This only happens once."
        />
      </List>
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
      title={portListTitle(port)}
      icon={portListIcon(port)}
      accessories={isShowingDetail ? accessories.filter((a) => a.tag) : accessories}
      detail={<PortListDetail port={port} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {detailToggleAction}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            {demoActions}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Port JSON"
              content={JSON.stringify(port, null, 2)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Full JSON" content={rawJson} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Re-Download CLI" icon={Icon.Download} onAction={onForceDownload} />
            <Action.OpenInBrowser title="Open WhatCable on GitHub" url={WHATCABLE_REPO_URL} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
