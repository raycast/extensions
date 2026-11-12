import { Icon, MenuBarExtra, Toast, environment, open, showToast, updateCommandMetadata, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { isAgentInstalled } from "./lib/agent";
import { type Display, type Selector, listDisplays, setState, targetSelector } from "./lib/hdrctl";

const OPEN_ON_CONNECT_DEEPLINK = `raycast://extensions/${environment.ownerOrAuthorName}/external-hdr/hdr-on-connect`;
const REFRESH_INTERVAL_MS = 30_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function findTarget(displays: Display[], selector: Selector | undefined): Display | undefined {
  if (selector && "id" in selector) {
    return displays.find((display) => display.id === selector.id);
  }
  if (selector && "name" in selector) {
    const wanted = selector.name.trim().toLowerCase();
    return displays.find((display) => display.name.trim().toLowerCase() === wanted);
  }
  return displays.find((display) => !display.builtin && display.hdrCapable);
}

export default function MenuBarCommand() {
  const { data: displays, isLoading, error, revalidate: revalidateDisplays } = useCachedPromise(listDisplays);
  const { data: agentInstalled, revalidate: revalidateAgent } = useCachedPromise(isAgentInstalled);

  // Keep the 30 s poll stable even if the hooks hand back new callbacks between renders.
  const revalidateRef = useRef({ displays: revalidateDisplays, agent: revalidateAgent });
  useEffect(() => {
    revalidateRef.current = { displays: revalidateDisplays, agent: revalidateAgent };
  }, [revalidateDisplays, revalidateAgent]);
  useEffect(() => {
    const timer = setInterval(() => {
      revalidateRef.current.displays();
      revalidateRef.current.agent();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  function refreshAll(): void {
    revalidateDisplays();
    revalidateAgent();
  }

  async function toggleHdr(display: Display): Promise<void> {
    try {
      await setState({ id: display.id }, display.hdr ? "off" : "on");
    } catch (toggleError) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Couldn't turn HDR ${display.hdr ? "off" : "on"}`,
        message: errorMessage(toggleError),
      });
    } finally {
      revalidateDisplays();
    }
  }

  const target = displays ? findTarget(displays, targetSelector()) : undefined;
  const subtitle = error
    ? "HDR state unavailable"
    : displays === undefined
      ? undefined
      : target
        ? `HDR ${target.hdr ? "on" : "off"} — ${target.name}`
        : "No HDR display connected";

  // Keep the root-search label in sync; the menu-bar command is already running.
  useEffect(() => {
    if (subtitle === undefined) return;
    void updateCommandMetadata({ subtitle }).catch(() => undefined);
  }, [subtitle]);

  const statusIcon =
    error || (displays && !target) ? Icon.ExclamationMark : target?.hdr ? Icon.CircleFilled : Icon.Circle;
  const tooltip = error
    ? "Couldn't read HDR state"
    : !displays
      ? "Reading HDR state…"
      : target
        ? `HDR ${target.hdr ? "on" : "off"} — ${target.name}`
        : "No HDR display connected";

  return (
    <MenuBarExtra icon={statusIcon} tooltip={tooltip} isLoading={isLoading}>
      {displays && displays.length > 0 ? (
        displays.map((display) => {
          const canToggle = display.hdrCapable && !display.builtin;
          return (
            <MenuBarExtra.Section key={display.id} title={display.name}>
              <MenuBarExtra.Item
                title={display.hdr ? "HDR is on" : "HDR is off"}
                subtitle={display.builtin ? "Built-in" : display.hdrCapable ? "HDR capable" : "No HDR support"}
                icon={display.hdr ? Icon.Checkmark : Icon.Circle}
                tooltip={canToggle ? `Click to turn HDR ${display.hdr ? "off" : "on"}` : "HDR can't be changed here"}
                onAction={canToggle ? () => void toggleHdr(display) : undefined}
              />
            </MenuBarExtra.Section>
          );
        })
      ) : (
        <MenuBarExtra.Item
          title={error ? "Couldn't read displays" : isLoading ? "Loading displays…" : "No displays found"}
          icon={error ? Icon.ExclamationMark : Icon.Monitor}
        />
      )}

      <MenuBarExtra.Section title="Watcher">
        <MenuBarExtra.Item
          title={`Watcher: ${agentInstalled ? "On" : "Off"}`}
          icon={agentInstalled ? Icon.CircleFilled : Icon.Circle}
          tooltip="Set rules in HDR on Connect"
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refreshAll}
        />
        <MenuBarExtra.Item
          title="Open HDR on Connect"
          icon={Icon.Gear}
          onAction={() => {
            void open(OPEN_ON_CONNECT_DEEPLINK).catch(async (openError) => {
              await showToast({
                style: Toast.Style.Failure,
                title: "Couldn't open HDR on Connect",
                message: errorMessage(openError),
              });
            });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
