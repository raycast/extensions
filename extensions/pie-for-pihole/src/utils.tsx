import { Action, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { getPiholeAPI } from "./api/client";

export function isV6(): boolean {
  return getPreferenceValues<Preferences>().PIHOLE_VERSION === "v6";
}

export function AddToListAction(props: { domain: string; listType: string }) {
  async function addToList() {
    const list = props.listType === "black" ? "deny" : "allow";
    showToast({
      style: Toast.Style.Animated,
      title: list === "deny" ? "Adding to blocklist..." : "Adding to allowlist...",
    });
    try {
      const api = getPiholeAPI();
      await api.addToList(props.domain, list);
      showToast({
        style: Toast.Style.Success,
        title: list === "deny" ? "Added to blocklist!" : "Added to allowlist!",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update list",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return (
    <Action
      title={props.listType === "black" ? "Add to Blocklist" : "Add to Allowlist"}
      onAction={() => addToList()}
      icon={props.listType === "black" ? Icon.XMarkCircle : Icon.Checkmark}
    />
  );
}

export function buildBaseURL(rawURL: string, defaultScheme: "http" | "https" = "http"): string {
  const schemeMatch = rawURL.match(/^(https?):\/\//);
  const scheme = schemeMatch ? schemeMatch[1] : defaultScheme;
  const host = rawURL
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/\/admin\/?.*$/, "");
  return `${scheme}://${host}`;
}

export function formatNumber(value: string): string {
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}
