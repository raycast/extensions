import { showHUD, LocalStorage } from "@raycast/api";
import { signOut } from "./lib/auth.js";

export default async function command(): Promise<void> {
    await signOut();
    await LocalStorage.removeItem("saasflow.selectedCompanyId");
    await showHUD("Signed out of SaaSFlow");
}
