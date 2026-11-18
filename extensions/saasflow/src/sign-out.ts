import { showHUD, LocalStorage } from "@raycast/api";
import { signOut } from "./lib/auth.js";
import { refreshMenuBar } from "./lib/menuBar.js";

export default async function command(): Promise<void> {
    await signOut();
    await LocalStorage.removeItem("saasflow.selectedCompanyId");
    await refreshMenuBar();
    await showHUD("Signed out of SaaSFlow");
}
