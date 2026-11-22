import { Action, ActionPanel, Icon, Keyboard, List, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { type ReactNode, useEffect, useState } from "react";
import { OrcaCliError, runOrca } from "../lib/orca-cli";
import { getOrcaPath } from "../lib/preferences";
import { isOrcaDown, parseStatus } from "../lib/status";

export const ORCA_APP_PATH = "/Applications/Orca.app";

const LAUNCH_POLL_INTERVAL_MS = 1_000;
const LAUNCH_MAX_WAIT_MS = 15_000;

/** Ouvre Orca au premier plan ; un échec affiche un toast d'erreur et renvoie false, jamais une exception. */
export async function openOrca(): Promise<boolean> {
  try {
    await open(ORCA_APP_PATH);
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to Open Orca" });
    return false;
  }
}

/**
 * Vérifie qu'Orca est joignable avant d'afficher la commande.
 * Pendant la vérification, les enfants sont rendus tels quels : leur liste porte son propre `isLoading`.
 */
export function OrcaGuard({ children }: { children: ReactNode }) {
  const [launching, setLaunching] = useState(false);

  // `onError` vide : l'état vide affiché plus bas suffit, sans le toast par défaut de Raycast.
  const { data, error, isLoading, revalidate } = usePromise(
    async () => parseStatus(await runOrca(["status"], { orcaPath: getOrcaPath() })),
    [],
    {
      onData: (status) => {
        if (!isOrcaDown(status, undefined)) {
          setLaunching(false);
        }
      },
      onError: () => {},
    },
  );

  // Orca planté (`runtime_unavailable`) revient à « pas lancé » : même copie, même action.
  const notRunning = isOrcaDown(data, error);

  useEffect(() => {
    if (!launching || !notRunning) {
      return;
    }
    const interval = setInterval(() => revalidate(), LAUNCH_POLL_INTERVAL_MS);
    const timeout = setTimeout(() => setLaunching(false), LAUNCH_MAX_WAIT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [launching, notRunning, revalidate]);

  const launchAndRecheck = async () => {
    if (await openOrca()) {
      setLaunching(true);
      revalidate();
    }
  };

  if (error && !notRunning) {
    if (error instanceof OrcaCliError && error.code === "binary_not_found") {
      return (
        <List isLoading={isLoading}>
          <List.EmptyView
            icon={Icon.Warning}
            title="Orca CLI Not Found"
            description="Check the CLI path in extension preferences."
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        </List>
      );
    }
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Orca Is Not Responding"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (notRunning) {
    return (
      <List isLoading={isLoading || launching}>
        <List.EmptyView
          icon={Icon.Power}
          title="Orca Is Not Running"
          description={
            launching ? "Waiting for Orca to start…" : "Launch Orca to talk to your bots and monitor your agents."
          }
          actions={
            <ActionPanel>
              <Action title="Launch Orca" icon={Icon.Play} onAction={launchAndRecheck} />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <>{children}</>;
}
