import { showToast, Toast } from "@raycast/api";
import { Vault } from "../api/vault/vault.types";

//--------------------------------------------------------------------------------
// All toasts for all commands should be defined here.
// (makes it easier to manage translations when they are added to Raycast)
//--------------------------------------------------------------------------------

export function noVaultPathsToast() {
  showToast({
    title: "Path Error",
    message: "Something went wrong with your vault path. There are no paths to select from.",
    style: Toast.Style.Failure,
  });
}

export function directoryCreationErrorToast(path: string) {
  showToast({
    title: "Couldn't create directories for the given path:",
    message: path,
    style: Toast.Style.Failure,
  });
}

export function fileWriteErrorToast(path: string, filename: string) {
  showToast({
    title: "Couldn't write to file:",
    message: path + "/" + filename + ".md",
    style: Toast.Style.Failure,
  });
}

export function vaultsWithoutAdvancedURIToast(vaultsWithoutPlugin: Vault[]) {
  showToast({
    title: "Vaults without Advanced URI plugin:",
    message: vaultsWithoutPlugin.map((vault: Vault) => vault.name).join(", "),
    style: Toast.Style.Failure,
  });
}
