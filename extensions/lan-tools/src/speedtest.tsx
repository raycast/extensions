import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  runSpeedTest,
  SPEED_PROVIDERS,
  type SpeedProgress,
  type SpeedProvider,
  type SpeedResult,
} from "./speedtest-engine";

const PROVIDER_LABELS: Record<SpeedProvider, string> = {
  yandex: "Yandex",
  cloudflare: "Cloudflare",
};

/**
 * Speed Test — measures the WAN connection. Streams live download/upload Mbps
 * while measuring, then settles into a final result list (latency / download /
 * upload / server / public IP). The provider is chosen via a List.Dropdown.
 * Pure HTTP — no external binary, no brew dependency.
 */
export default function Command() {
  const [provider, setProvider] = useState<SpeedProvider>("cloudflare");
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [phase, setPhase] = useState<SpeedProgress["phase"] | "idle">("idle");
  const [liveMbps, setLiveMbps] = useState(0);
  const [failed, setFailed] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    setResult(null);
    setPhase("probing");
    setLiveMbps(0);
    setFailed(false);
    void updateCommandMetadata({ subtitle: "Speed test…" });

    const onProgress = (p: SpeedProgress) => {
      setPhase(p.phase);
      setLiveMbps(p.currentMbps);
      if (p.phase === "downloading") {
        void updateCommandMetadata({
          subtitle: `↓${p.currentMbps.toFixed(1)} Mbps · measuring`,
        });
      } else if (p.phase === "uploading") {
        void updateCommandMetadata({
          subtitle: `↑${p.currentMbps.toFixed(1)} Mbps · measuring`,
        });
      }
    };

    runSpeedTest(provider, onProgress)
      .then((r) => {
        setResult(r);
        setPhase("done");
        setLiveMbps(0);
        void updateCommandMetadata({
          subtitle: `↓${r.downloadMbps.toFixed(1)} Mbps · ↑${r.uploadMbps.toFixed(1)} Mbps · ${Math.round(r.pingMs)} ms`,
        });
      })
      .catch((e) => {
        setFailed(true);
        setPhase("done");
        void updateCommandMetadata({ subtitle: "Speed test failed" });
        void showToast({
          style: Toast.Style.Failure,
          title: "Speed test failed",
          message: e instanceof Error ? e.message : String(e),
        });
      });
  }, [runKey, provider]);

  const reRun = () => setRunKey((k) => k + 1);
  const reRunAction = (
    <Action title="Re-Run" icon={Icon.RotateClockwise} onAction={reRun} />
  );

  const running = phase === "downloading" || phase === "uploading";

  if (failed) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Speed test failed"
          description={`Could not reach ${PROVIDER_LABELS[provider]}'s speed-test servers. Check your internet connection and try again.`}
          actions={
            <ActionPanel>
              <Action
                title="Re-Run"
                icon={Icon.RotateClockwise}
                onAction={reRun}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={!result && !failed}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Provider"
          value={provider}
          onChange={(v) => setProvider(v as SpeedProvider)}
        >
          {SPEED_PROVIDERS.map((p) => (
            <List.Dropdown.Item key={p} title={PROVIDER_LABELS[p]} value={p} />
          ))}
        </List.Dropdown>
      }
    >
      {result ? (
        <List.Section title={`Result · ${PROVIDER_LABELS[provider]}`}>
          <List.Item
            icon={{ source: Icon.ArrowDown, tintColor: Color.Blue }}
            title="Download"
            subtitle={`${result.downloadMbps.toFixed(1)} Mbps`}
            actions={<ActionPanel>{reRunAction}</ActionPanel>}
          />
          <List.Item
            icon={{ source: Icon.ArrowUp, tintColor: Color.Blue }}
            title="Upload"
            subtitle={`${result.uploadMbps.toFixed(1)} Mbps`}
          />
          <List.Item
            icon={{ source: Icon.Dot, tintColor: Color.Green }}
            title="Latency"
            subtitle={`${Math.round(result.pingMs)} ms`}
          />
          {result.server && (
            <List.Item
              icon={Icon.Network}
              title="Server"
              subtitle={result.server}
            />
          )}
          {result.publicIp && (
            <List.Item
              icon={Icon.Globe}
              title="Public IP"
              subtitle={result.publicIp}
            />
          )}
        </List.Section>
      ) : (
        <List.Section title={running ? "Measuring…" : "Starting…"}>
          {phase === "downloading" && (
            <List.Item
              icon={{ source: Icon.ArrowDown, tintColor: Color.Blue }}
              title="Download"
              subtitle={`${liveMbps.toFixed(1)} Mbps`}
            />
          )}
          {phase === "uploading" && (
            <List.Item
              icon={{ source: Icon.ArrowUp, tintColor: Color.Blue }}
              title="Upload"
              subtitle={`${liveMbps.toFixed(1)} Mbps`}
            />
          )}
          {(phase === "probing" || phase === "idle") && (
            <List.Item
              icon={Icon.MagnifyingGlass}
              title="Finding servers…"
              subtitle={PROVIDER_LABELS[provider]}
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
