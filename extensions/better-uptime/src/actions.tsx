import { Action, Clipboard, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { HeartbeatItem, IncidentItem, MonitorItem, Preferences } from "./interface";
import { baseUrl } from "./constants";
import fetch from "node-fetch";

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

export function ActionDeleteMonitor({ item, onDeleted }: { item: MonitorItem; onDeleted: () => void }) {
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

        await fetch(`${baseUrl}/monitors/${item.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json();
              throw { response: { data: errorData } };
            }

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
export function ActionDeleteIncident({ item, onDeleted }: { item: IncidentItem; onDeleted: () => void }) {
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

        await fetch(`${baseUrl}/incidents/${item.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json();
              throw { response: { data: errorData } };
            }

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

export function ActionDeleteHeartbeat({ item, onDeleted }: { item: HeartbeatItem; onDeleted: () => void }) {
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

        await fetch(`${baseUrl}/heartbeats/${item.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json();
              throw { response: { data: errorData } };
            }

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
