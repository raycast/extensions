import { showHUD, showToast, Toast } from "@raycast/api";
import { aktualisieren, SbFehlt } from "./sb";

/**
 * Der einzige Befehl, der die Bank anfragt.
 *
 * Bewusst ein eigener Befehl und nicht Teil der Ansichten: Ein Abruf kann je nach Bank
 * eine TAN oder eine Freigabe im Browser verlangen. Das darf nicht passieren, weil
 * jemand nur den Saldo sehen wollte.
 */
export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing accounts…",
  });
  try {
    await aktualisieren();
    toast.style = Toast.Style.Success;
    toast.title = "Accounts refreshed";
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Refresh failed";
    toast.message = e instanceof SbFehlt ? e.message : String(e);
    await showHUD("simplebanking could not refresh");
  }
}
