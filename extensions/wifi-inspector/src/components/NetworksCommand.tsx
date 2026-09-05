import {
  Action,
  ActionPanel,
  Clipboard,
  environment,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { NetworkListDetail } from "./NetworkListDetail";
import { SetupView } from "./SetupView";
import { DEMO_NETWORKS, DEMO_STORAGE_KEY } from "../lib/demo-networks";
import { displaySsid, networkAccessories, networkListIcon, sortNetworks } from "../lib/format";
import { currentConnection, fetchWifiPassword, MacwifiError, scanNetworks } from "../lib/macwifi";
import { DEMO_SPEED_RESULT, formatMbps, runSpeedTest, SpeedTestError, type SpeedTestResult } from "../lib/speedtest";
import type { WifiNetwork } from "../lib/types";

export type NetworksMode = "scan" | "current";

interface NetworksCommandProps {
  mode: NetworksMode;
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
}

type NetworksPayload = {
  cliPath: string;
  networks: WifiNetwork[];
  raw: string;
};

function networkItemId(network: WifiNetwork): string {
  return `${network.ssid}|${network.bssid}|${network.channel}`;
}

function demoPayload(mode: NetworksMode): NetworksPayload {
  const networks = mode === "current" ? DEMO_NETWORKS.filter((n) => n.current) : DEMO_NETWORKS;
  return {
    cliPath: "demo",
    networks,
    raw: JSON.stringify(networks, null, 2),
  };
}

async function loadNetworks(mode: NetworksMode, options?: { forceDownload?: boolean }): Promise<NetworksPayload> {
  if (mode === "current") {
    const result = await currentConnection(options);
    return {
      cliPath: result.cliPath,
      networks: result.network ? [result.network] : [],
      raw: result.raw,
    };
  }
  const result = await scanNetworks(options);
  return {
    cliPath: result.cliPath,
    networks: result.networks,
    raw: result.raw,
  };
}

export function NetworksCommand({ mode, searchBarPlaceholder, emptyTitle, emptyDescription }: NetworksCommandProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [useDemoData, setUseDemoData] = useState(false);
  const [demoReady, setDemoReady] = useState(!environment.isDevelopment);
  const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
  const [speedSsid, setSpeedSsid] = useState<string | null>(null);
  const [isSpeedTesting, setIsSpeedTesting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const autoStartedForRef = useRef<string | null>(null);
  const isSpeedTestingRef = useRef(false);
  const speedAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      speedAbortRef.current?.abort();
    };
  }, []);

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

  useEffect(() => {
    if (environment.isDevelopment && useDemoData) {
      setSpeedResult(DEMO_SPEED_RESULT);
      setSpeedSsid(DEMO_NETWORKS.find((n) => n.current)?.ssid ?? null);
      setIsSpeedTesting(false);
      autoStartedForRef.current = DEMO_NETWORKS.find((n) => n.current)?.ssid ?? null;
    } else {
      setSpeedResult(null);
      setSpeedSsid(null);
      autoStartedForRef.current = null;
    }
  }, [useDemoData]);

  const { isLoading, data, error, revalidate, mutate } = useCachedPromise(
    async (demo: boolean, activeMode: NetworksMode) => {
      if (environment.isDevelopment && demo) {
        return demoPayload(activeMode);
      }
      return loadNetworks(activeMode);
    },
    [useDemoData, mode],
    { keepPreviousData: true, execute: demoReady },
  );

  const refresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  const forceRedownload = useCallback(() => {
    void mutate(loadNetworks(mode, { forceDownload: true }));
  }, [mode, mutate]);

  const enableDemoData = useCallback(() => {
    void LocalStorage.setItem(DEMO_STORAGE_KEY, "1");
    setUseDemoData(true);
  }, []);

  const disableDemoData = useCallback(() => {
    void LocalStorage.removeItem(DEMO_STORAGE_KEY);
    setUseDemoData(false);
  }, []);

  const runNetworkSpeedTest = useCallback(
    async (ssid: string, options?: { force?: boolean }) => {
      if (isSpeedTestingRef.current) {
        return;
      }
      if (!options?.force && speedSsid === ssid && speedResult) {
        return;
      }

      speedAbortRef.current?.abort();
      const abortController = new AbortController();
      speedAbortRef.current = abortController;

      isSpeedTestingRef.current = true;
      setIsSpeedTesting(true);
      setSpeedSsid(ssid);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Running speed test…",
        message: ssid,
      });
      try {
        const result = await runSpeedTest({
          signal: abortController.signal,
          onProgress: (progress) => {
            toast.message = progress.message;
          },
        });
        setSpeedResult(result);
        toast.style = Toast.Style.Success;
        toast.title = "Speed test complete";
        toast.message = `↓ ${formatMbps(result.downloadMbps)} · ↑ ${formatMbps(result.uploadMbps)} · ${Math.round(result.latencyMs)} ms`;
      } catch (err) {
        if (abortController.signal.aborted) {
          toast.hide();
          return;
        }
        toast.style = Toast.Style.Failure;
        toast.title = "Speed test failed";
        toast.message =
          err instanceof SpeedTestError ? err.message : err instanceof Error ? err.message : "Unknown error";
      } finally {
        if (speedAbortRef.current === abortController) {
          speedAbortRef.current = null;
        }
        isSpeedTestingRef.current = false;
        setIsSpeedTesting(false);
      }
    },
    [speedResult, speedSsid],
  );

  const networks = useMemo(() => sortNetworks(data?.networks ?? []), [data?.networks]);

  // Auto-run when details are open on the connected network (scan + current).
  useEffect(() => {
    if (!isShowingDetail || useDemoData || !demoReady || isLoading) {
      return;
    }
    if (isSpeedTestingRef.current) {
      return;
    }

    const selected =
      (selectedId ? networks.find((network) => networkItemId(network) === selectedId) : undefined) ??
      networks.find((network) => network.current);

    if (!selected?.current) {
      return;
    }
    if (speedSsid === selected.ssid && speedResult) {
      return;
    }
    if (autoStartedForRef.current === selected.ssid) {
      return;
    }

    autoStartedForRef.current = selected.ssid;
    void runNetworkSpeedTest(selected.ssid);
  }, [
    demoReady,
    isLoading,
    isShowingDetail,
    networks,
    runNetworkSpeedTest,
    selectedId,
    speedResult,
    speedSsid,
    useDemoData,
  ]);

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

  if (error && !data) {
    const message =
      error instanceof MacwifiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Something went wrong while loading Wi-Fi data.";

    return (
      <SetupView
        title="Wi-Fi Inspector"
        isLoading={isLoading}
        markdown={`# Could not load Wi-Fi data\n\n${message}\n\nOn first scan, macOS may ask for **Location Services** access for WifiScanner. Approve it under System Settings → Privacy & Security → Location Services.\n\nIf this is the first launch, check your network connection so the official CLI can be downloaded from GitHub Releases.`}
        onRetry={refresh}
        onForceDownload={forceRedownload}
      />
    );
  }

  if ((!data && isLoading) || !demoReady) {
    return (
      <SetupView
        title="Wi-Fi Inspector"
        isLoading
        markdown={`# Preparing Wi-Fi Inspector\n\nLooking for a local macwifi-cli, or downloading the official binary from GitHub Releases.\n\nThis only happens once (unless you re-download).\n\nThe first scan may also prompt for Location Services so BSSIDs can be shown.`}
      />
    );
  }

  const detailToggleAction = isShowingDetail ? (
    <Action title="Hide Details" icon={Icon.EyeDisabled} onAction={() => setIsShowingDetail(false)} />
  ) : (
    <Action title="Show Details" icon={Icon.Eye} onAction={() => setIsShowingDetail(true)} />
  );

  return (
    <List
      isLoading={isLoading || isSpeedTesting}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={searchBarPlaceholder}
      onSelectionChange={setSelectedId}
    >
      <List.EmptyView
        icon={Icon.WifiDisabled}
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action title="Re-Download CLI" icon={Icon.Download} onAction={forceRedownload} />
            <Action
              title="Open Location Services Settings"
              icon={Icon.Gear}
              onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Location")}
            />
            {demoActions}
          </ActionPanel>
        }
      />
      {networks.map((network) => {
        const resultForNetwork = speedSsid === network.ssid ? speedResult : null;
        const testingThis = isSpeedTesting && speedSsid === network.ssid;
        return (
          <NetworkListItem
            key={networkItemId(network)}
            id={networkItemId(network)}
            network={network}
            isShowingDetail={isShowingDetail}
            rawJson={data?.raw ?? ""}
            detailToggleAction={detailToggleAction}
            demoActions={demoActions}
            speedResult={resultForNetwork}
            isSpeedTesting={testingThis}
            onRefresh={refresh}
            onForceDownload={forceRedownload}
            onRunSpeedTest={() => {
              autoStartedForRef.current = network.ssid;
              void runNetworkSpeedTest(network.ssid, { force: true });
            }}
          />
        );
      })}
    </List>
  );
}

async function copyWifiPassword(ssid: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Reading Keychain…", message: ssid });
  try {
    const result = await fetchWifiPassword(ssid);
    if (!result.found || !result.password) {
      toast.style = Toast.Style.Failure;
      toast.title = "No saved password";
      toast.message = `No Keychain entry for ${ssid}`;
      return;
    }
    await Clipboard.copy(result.password);
    toast.style = Toast.Style.Success;
    toast.title = "Password copied";
    toast.message = ssid;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not read password";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

function NetworkListItem({
  id,
  network,
  isShowingDetail,
  rawJson,
  detailToggleAction,
  demoActions,
  speedResult,
  isSpeedTesting,
  onRefresh,
  onForceDownload,
  onRunSpeedTest,
}: {
  id: string;
  network: WifiNetwork;
  isShowingDetail: boolean;
  rawJson: string;
  detailToggleAction: ReactNode;
  demoActions: ReactNode;
  speedResult: SpeedTestResult | null;
  isSpeedTesting: boolean;
  onRefresh: () => void;
  onForceDownload: () => void;
  onRunSpeedTest: () => void;
}) {
  const accessories = networkAccessories(network, {
    downloadLabel: speedResult ? formatMbps(speedResult.downloadMbps) : undefined,
    isSpeedTesting,
  });
  const title = displaySsid(network);
  const speedActionTitle = isSpeedTesting
    ? "Speed Test Running…"
    : speedResult
      ? "Re-run Speed Test"
      : "Run Speed Test";

  return (
    <List.Item
      id={id}
      title={title}
      icon={networkListIcon(network)}
      accessories={isShowingDetail ? accessories.filter((a) => a.tag) : accessories}
      detail={<NetworkListDetail network={network} speedResult={speedResult} isSpeedTesting={isSpeedTesting} />}
      actions={
        <ActionPanel>
          {detailToggleAction}
          {network.current ? (
            <Action
              title={speedActionTitle}
              icon={Icon.Gauge}
              onAction={onRunSpeedTest}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
            />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          {network.saved || network.current ? (
            <Action
              title="Copy Wi-Fi Password"
              icon={Icon.Key}
              onAction={() => void copyWifiPassword(network.ssid)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {demoActions}
          <Action.CopyToClipboard title="Copy SSID" content={network.ssid} shortcut={Keyboard.Shortcut.Common.Copy} />
          {network.bssid ? <Action.CopyToClipboard title="Copy BSSID" content={network.bssid} /> : null}
          {speedResult ? (
            <Action.CopyToClipboard
              title="Copy Speed Results"
              content={`Download: ${formatMbps(speedResult.downloadMbps)}\nUpload: ${formatMbps(speedResult.uploadMbps)}\nLatency: ${Math.round(speedResult.latencyMs)} ms`}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Network JSON" content={JSON.stringify(network, null, 2)} />
          <Action.CopyToClipboard title="Copy Full JSON" content={rawJson} />
          <Action title="Re-Download CLI" icon={Icon.Download} onAction={onForceDownload} />
          <Action
            title="Open Location Services Settings"
            icon={Icon.Gear}
            onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Location")}
          />
          <Action
            title="Open Macwifi-Cli on GitHub"
            icon={Icon.Globe}
            onAction={() => open("https://github.com/jaisonerick/macwifi-cli")}
          />
        </ActionPanel>
      }
    />
  );
}
