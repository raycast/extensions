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

export function ActionDeleteMonitor({ item, onDeleted }: { item: any; onDeleted: () => void }) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Delete Monitor"
      icon={Icon.Trash}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Deleting monitor...",
        });

        await axios
          .delete(`https://betteruptime.com/api/v2/heartbeats/${item.id}`, {
            headers: { Authorization: `Bearer ${preferences.apiKey}` },
          })
          .then(() => {
            toast.style = Toast.Style.Success;
            toast.title = "Monitor deleted successfully";

            onDeleted();
          })
          .catch((error) => {
            toast.style = Toast.Style.Failure;
            toast.title = "Unable to delete monitor";
            toast.message = error.response.data.errors;
          });
      }}
    />
  );
}

export function ActionDeleteIncident({ item, onDeleted }: { item: any; onDeleted: () => void }) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Delete Incident"
      icon={Icon.Trash}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Deleting incident...",
        });

        await axios
          .delete(`https://betteruptime.com/api/v2/incidents/${item.id}`, {
            headers: { Authorization: `Bearer ${preferences.apiKey}` },
          })
          .then(() => {
            toast.style = Toast.Style.Success;
            toast.title = "Incident deleted successfully";

            onDeleted();
          })
          .catch((error) => {
            toast.style = Toast.Style.Failure;
            toast.title = "Unable to delete incident";
            toast.message = error.response.data.errors;
          });
      }}
    />
  );
}

export function ActionDeleteHeartbeat({ item, onDeleted }: { item: any; onDeleted: () => void }) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <Action
      title="Delete Heartbeat"
      icon={Icon.Trash}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Deleting heartbeat...",
        });

        await axios
          .delete(`https://betteruptime.com/api/v2/heartbeats/${item.id}`, {
            headers: { Authorization: `Bearer ${preferences.apiKey}` },
          })
          .then(() => {
            toast.style = Toast.Style.Success;
            toast.title = "Heartbeat deleted successfully";

            onDeleted();
          })
          .catch((error) => {
            toast.style = Toast.Style.Failure;
            toast.title = "Unable to delete heartbeat";
            toast.message = error.response.data.errors;
          });
      }}
    />
  );
}
