import { useEffect, useState } from "react";
import { Alert, AlertType, ContentType, ContentTypeNames, ContentTypeURLMap } from "./types/alert";
import { AlertsService } from "./services/alertsService";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { UserUtils } from "./utils/userUtils";
import { Clipboard, Color, Icon, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import { formatRelativeDate } from "./utils/dateUtils";

export default function Command() {
  const [enrichedAlerts, setEnrichedAlerts] = useState<Alert[]>([]);

  const {
    data: alertResponse,
    isLoading,
    revalidate,
  } = useCachedPromise(() => AlertsService.fetchAlerts(), [], {
    keepPreviousData: false,
    initialData: [],
  });

  useEffect(() => {
    async function enrichAlerts() {
      const alerts = Array.isArray(alertResponse) ? alertResponse : [];
      if (alerts.length === 0) return;

      // Filter out read alerts first
      const unreadAlerts = alerts.filter((alert) => !alert.read);
      const enriched = [...unreadAlerts];

      // Process alerts in batches
      const batchSize = 5;
      for (let i = 0; i < enriched.length; i += batchSize) {
        const batch = enriched.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (alert, index) => {
            try {
              if (alert.caused_member_id !== 0) {
                const username = await UserUtils.idToUsername(alert.caused_member_id);
                enriched[i + index] = { ...alert, username };
              } else {
                enriched[i + index] = { ...alert, username: "Guest User" };
              }
            } catch (error) {
              console.error(`Error fetching username for ID ${alert.caused_member_id}:`, error);
            }
          }),
        );
      }
      setEnrichedAlerts(enriched);
    }
    enrichAlerts();
  }, [alertResponse]);

  const handleMarkAllAsRead = async () => {
    try {
      const success = await AlertsService.markAllAsRead();
      if (success) {
        await showToast(Toast.Style.Success, "Marked all notifications as read");
        await UserUtils.clearCache();
        revalidate();
      } else {
        await showFailureToast("Failed to mark notifications as read", {
          title: "Failed to mark notifications as read",
        });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Error marking notifications as read", message: String(error) });
    }
  };

  const getAlertMessage = (alert: Alert) => {
    const username = alert.username || `User #${alert.caused_member_id}`;
    const contentTypeName = ContentTypeNames[alert.content_type as ContentType] || "content";

    switch (alert.alert_type) {
      case AlertType.REACTION:
        return `${username} reacted to your ${contentTypeName}`;
      case AlertType.REPLY:
        return `${username} replied to your ${contentTypeName}`;
      case AlertType.TICKET_MOVED:
        return `Your ticket has been moved`;
      case AlertType.MENTION:
        return `${username} mentioned you in a ${contentTypeName}`;
      default:
        return `New notification from ${username}`;
    }
  };

  const handleDebug = async () => {
    await Clipboard.copy(JSON.stringify(alertResponse, null, 2));
    await showToast(Toast.Style.Success, "Debug information copied to clipboard. Please send this to Geek");
  };

  const getContentUrl = (alert: Alert) => {
    const baseUrl = ContentTypeURLMap[alert.content_type as ContentType];
    if (alert.content_type === ContentType.WIKI) {
      return `${baseUrl}`;
    }
    return `${baseUrl}/${alert.content_id}`;
  };

  const handleRefresh = async () => {
    await UserUtils.clearCache();
    revalidate();
  };

  const unreadCount = enrichedAlerts.filter((a) => !a.read).length;

  return (
    <MenuBarExtra
      icon={
        unreadCount > 0
          ? { source: "../assets/bbb-icon.png" }
          : { source: "../assets/bbb-icon.png", tintColor: Color.SecondaryText }
      }
      title={unreadCount > 0 ? String(unreadCount) : "0"}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={unreadCount > 0 ? "Notifications" : "No Unread Notifications"}>
        {enrichedAlerts.map((alert) => (
          <MenuBarExtra.Item
            key={alert.content_id}
            title={getAlertMessage(alert)}
            onAction={() => {
              open(getContentUrl(alert));
              const updatedAlerts = enrichedAlerts.map((a) =>
                a.content_id === alert.content_id ? { ...a, read: true } : a,
              );
              setEnrichedAlerts(updatedAlerts);
              revalidate();
            }}
            subtitle={formatRelativeDate(alert.alert_date)}
          />
        ))}
        {unreadCount > 0 && (
          <MenuBarExtra.Item
            title="Mark All as Read"
            icon={Icon.CheckCircle}
            onAction={handleMarkAllAsRead}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        )}
        <MenuBarExtra.Item
          title="View All Alerts"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://builtbybit.com/account/alerts")}
          icon={Icon.Link}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={handleRefresh}
        />
        <MenuBarExtra.Item
          title="Clear User Cache"
          icon={Icon.Trash}
          onAction={async () => {
            await UserUtils.clearCache();
            await showToast(Toast.Style.Success, "User cache cleared");
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
        <MenuBarExtra.Item title="Copy Debug Information" icon={Icon.Bug} onAction={handleDebug} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
