import { Action, Clipboard, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { Preferences } from "./interface";

export function ActionCopyUrl({ url }: { url: string }) {
  return (
    <Action
      title="Copy URL"
      icon={Icon.Clipboard}
      onAction={async () => {
        await Clipboard.copy(url);

        showToast({ title: "Copied", message: "URL copied to clipboard" });
      }}
    />
  );
}

export function ActionCopyHeartbeatUrl({ url }: { url: string }) {
  return (
    <Action
      title="Copy Heartbeat URL"
      icon={Icon.Clipboard}
      onAction={async () => {
        await Clipboard.copy(url);

        showToast({ title: "Copied", message: "Heartbeat URL copied to clipboard" });
      }}
    />
  );
}

export function ActionCopyScreenshotUrl({ url }: { url: string }) {
  return (
    <Action
      title="Copy Screenshot URL"
      icon={Icon.Clipboard}
      onAction={async () => {
        await Clipboard.copy(url);

        showToast({ title: "Copied", message: "Screenshot URL copied to clipboard" });
      }}
    />
  );
}

export function ActionDeleteMonitor({ item }: { item: any }) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Delete Monitor"
      icon={Icon.Trash}
      onAction={async () => {
        await axios
          .delete(`https://betteruptime.com/api/v2/heartbeats/${item.id}`, {
            headers: { Authorization: `Bearer ${preferences.apiKey}` },
          })
          .then(() => {
            showToast({ title: "Success", message: "Successfully deleted monitor" });
          })
          .catch((error) => {
            showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
          });
      }}
    />
  );
}

export function ActionDeleteIncident({ item }: { item: any }) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Delete Incident"
      icon={Icon.Trash}
      onAction={async () => {
        await axios
          .delete(`https://betteruptime.com/api/v2/incidents/${item.id}`, {
            headers: { Authorization: `Bearer ${preferences.apiKey}` },
          })
          .then(() => {
            showToast({ title: "Success", message: "Successfully deleted incident" });
          })
          .catch((error) => {
            showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
          });
      }}
    />
  );
}

export function ActionDeleteHeartbeat({ item }: { item: any }) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Delete Heartbeat"
      icon={Icon.Trash}
      onAction={async () => {
        await axios
          .delete(`https://betteruptime.com/api/v2/heartbeats/${item.id}`, {
            headers: { Authorization: `Bearer ${preferences.apiKey}` },
          })
          .then(() => {
            showToast({ title: "Success", message: "Successfully deleted heartbeat" });
          })
          .catch((error) => {
            showToast(Toast.Style.Failure, "An error occurred", error.response.data.errors);
          });
      }}
    />
  );
}
