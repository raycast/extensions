import { Action, ActionPanel, Icon, List, Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ReactNode } from "react";
import { OrcaCliError, runOrca } from "../lib/orca-cli";
import { getOrcaPath } from "../lib/preferences";
import { isOrcaDown, parseStatus } from "../lib/status";

export const ORCA_APP_PATH = "/Applications/Orca.app";

/** Ouvre Orca au premier plan ; un échec devient un toast français et renvoie false, jamais une exception. */
export async function openOrca(): Promise<boolean> {
  try {
    await open(ORCA_APP_PATH);
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open Orca",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Vérifie qu'Orca est joignable avant d'afficher la commande.
 * Pendant la vérification, les enfants sont rendus tels quels : leur liste porte son propre `isLoading`.
 */
export function OrcaGuard({ children }: { children: ReactNode }) {
  // `onError` vide : l'état vide affiché plus bas suffit, sans le toast par défaut de Raycast.
  const { data, error } = usePromise(
    async () => parseStatus(await runOrca(["status"], { orcaPath: getOrcaPath() })),
    [],
    { onError: () => {} },
  );

  // Orca planté (`runtime_unavailable`) revient à « pas lancé » : même copie, même action.
  const notRunning = isOrcaDown(data, error);

  if (error && !notRunning) {
    if (error instanceof OrcaCliError && error.code === "binary_not_found") {
      return (
        <List>
          <List.EmptyView
            icon={Icon.Warning}
            title="Orca CLI Not Found"
            description="Check the CLI path in extension preferences."
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List>
      );
    }
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Orca Is Not Responding" description={error.message} />
      </List>
    );
  }

  if (notRunning) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Power}
          title="Orca Is Not Running"
          description="Launch Orca to talk to your bots and monitor your agents."
          actions={
            <ActionPanel>
              <Action title="Launch Orca" icon={Icon.Play} onAction={openOrca} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <>{children}</>;
}
