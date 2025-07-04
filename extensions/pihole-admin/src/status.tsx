// @ts-nocheck
import React from "react";
import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { piHoleAPI } from "./lib/api";

export default function Status() {
  const { push } = useNavigation();

  const {
    data: apiData,
    isLoading: isApiLoading,
    error: apiError,
    revalidate: revalidateApi,
  } = useCachedPromise(
    async () => {
      // Load data sequentially to avoid multiple authentications
      const summary = await piHoleAPI.getSummary();
      const status = await piHoleAPI.getStatus();
      return { summary, status };
    },
    [],
    {
      initialData: null,
    }
  );

  // Extraer datos de forma segura
  const summary = apiData?.summary;
  const status = apiData?.status;

  const isLoading = isApiLoading;
  const hasErrors = apiError;

  const revalidateAll = () => {
    revalidateApi();
  };

  // Función segura para formatear números
  function formatNumber(num: number | undefined | null): string {
    if (!num || typeof num !== "number") return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  // Función segura para obtener el icono de status
  function getStatusIcon(): string {
    if (!status || typeof status.enabled !== "boolean") return "⚪";
    return status.enabled ? "🟢" : "🔴";
  }

  // Safe function to get status text
  function getStatusText(): string {
    if (!status || typeof status.enabled !== "boolean") return "Unknown";
    return status.enabled ? "Active" : "Disabled";
  }

  // Función segura para obtener el porcentaje bloqueado
  function getBlockedPercentage(): string {
    try {
      if (
        !summary ||
        !summary.dns ||
        typeof summary.dns.queries_today !== "number" ||
        typeof summary.dns.blocked_today !== "number" ||
        summary.dns.queries_today === 0
      ) {
        return "0%";
      }
      const percentage = (summary.dns.blocked_today / summary.dns.queries_today) * 100;
      return percentage.toFixed(1) + "%";
    } catch (error) {
      // Error calculating percentage
      return "0%";
    }
  }

  // Funciones seguras para obtener valores
  const getQueriesToday = () => summary?.dns?.queries_today || 0;
  const getBlockedToday = () => summary?.dns?.blocked_today || 0;
  const getQueriesForwarded = () => summary?.dns?.queries_forwarded || 0;
  const getQueriesCached = () => summary?.dns?.queries_cached || 0;
  const getUniqueDomains = () => summary?.dns?.unique_domains || 0;
  const getClientsEverSeen = () => summary?.dns?.clients_ever_seen || 0;
  const getDomainsBeingBlocked = () => summary?.gravity?.domains_being_blocked || 0;

  const markdown = `
# ${getStatusIcon()} Pi-hole Status: ${getStatusText()}

## 📊 Today's Statistics

| Metric | Value |
|---------|--------|
| **Total Queries** | ${formatNumber(getQueriesToday())} |
| **Blocked Queries** | ${formatNumber(getBlockedToday())} |
| **Blocked Percentage** | ${getBlockedPercentage()} |
| **Domains in Blocklist** | ${formatNumber(getDomainsBeingBlocked())} |

## 🌐 System Information

| Metric | Value |
|---------|--------|
| **Unique Clients** | ${getClientsEverSeen()} |
| **Unique Domains** | ${formatNumber(getUniqueDomains())} |
| **Forwarded Queries** | ${formatNumber(getQueriesForwarded())} |
| **Cached Queries** | ${formatNumber(getQueriesCached())} |

---

### 🚀 Quick Actions
- **Enable/Disable**: Control Pi-hole DNS blocking
- **View Logs**: Examine recent DNS queries
- **Top Domains**: View most queried domains
- **Add Domain**: Add domains to allow/block lists

${hasErrors ? "\n⚠️ **Error loading data**: " + (apiError?.message || "Unknown error") : ""}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Main Actions">
            <Action
              title="Enable/disable Blocking"
              icon={status?.enabled ? Icon.Stop : Icon.Play}
              onAction={() => push(<EnableDisableView onComplete={revalidateAll} />)}
            />
            <Action title="View Query Log" icon={Icon.List} onAction={() => push(<QueryLogView />)} />
            <Action title="View Top Domains" icon={Icon.BarChart} onAction={() => push(<TopDomainsView />)} />
            <Action title="Add Domain" icon={Icon.Plus} onAction={() => push(<AddDomainView />)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Utilities">
            <Action
              title="Flush Logs"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                try {
                  await piHoleAPI.flushLogs();
                  revalidateAll();
                } catch (error) {
                  // Error flushing logs handled by API layer
                }
              }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidateAll}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Componente para activar/desactivar Pi-hole
function EnableDisableView({ onComplete }: { onComplete: () => void }) {
  const { pop } = useNavigation();

  const { data: status, isLoading } = useCachedPromise(async () => {
    return await piHoleAPI.getStatus();
  }, []);

  const handleToggle = async (disable?: boolean, duration?: number) => {
    try {
      if (disable) {
        await piHoleAPI.disable(duration);
      } else {
        await piHoleAPI.enable();
      }
      onComplete();
      pop();
    } catch (error) {
      // Error changing status handled by API layer
    }
  };

  const markdown = `
# ${status?.enabled ? "🟢 Pi-hole Active" : "🔴 Pi-hole Disabled"}

${
  status?.enabled
    ? "Pi-hole is blocking DNS queries. You can temporarily disable it if you need full internet access."
    : "Pi-hole is disabled. DNS queries are not being blocked."
}

## Control Options

Select an action:
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {status?.enabled ? (
            <ActionPanel.Section title="Disable Pi-hole">
              <Action title="Disable for 5 Minutes" icon={Icon.Clock} onAction={() => handleToggle(true, 300)} />
              <Action title="Disable for 30 Minutes" icon={Icon.Clock} onAction={() => handleToggle(true, 1800)} />
              <Action title="Disable for 1 Hour" icon={Icon.Clock} onAction={() => handleToggle(true, 3600)} />
              <Action
                title="Disable Permanently"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={() => handleToggle(true)}
              />
            </ActionPanel.Section>
          ) : (
            <ActionPanel.Section title="Enable Pi-hole">
              <Action title="Enable Pi-hole" icon={Icon.Play} onAction={() => handleToggle(false)} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Vista para mostrar dominios principales
function TopDomainsView() {
  const { data: topDomains, isLoading } = useCachedPromise(async () => {
    return await piHoleAPI.getTopDomains(20);
  }, []);

  const allowedList = topDomains?.allowed || [];
  const blockedList = topDomains?.blocked || [];

  const markdown = `
# 📊 Top Domains

## 🟢 Allowed Domains (Top ${allowedList.length})

${allowedList.map((item, index) => `${index + 1}. **${item.domain}** - ${item.count} queries`).join("\n")}

## 🔴 Blocked Domains (Top ${blockedList.length})

${blockedList.map((item, index) => `${index + 1}. **${item.domain}** - ${item.count} attempts`).join("\n")}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              // Navigate back to trigger revalidation
              window.location.reload();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

// Vista para el registro de consultas
function QueryLogView() {
  const { data: queryLog, isLoading } = useCachedPromise(async () => {
    return await piHoleAPI.getQueryLog();
  }, []);

  const queries = queryLog?.queries || [];

  const markdown = `
# 📝 DNS Query Log

${queries
  .slice(0, 50)
  .map((query, index) => {
    const date = new Date(query.timestamp);
    const status = query.status === "blocked" ? "🔴 BLOCKED" : "🟢 ALLOWED";

    return `## ${index + 1}. ${query.domain}
- **Status**: ${status}
- **Client**: ${query.client}
- **Time**: ${date.toLocaleTimeString()}
- **Type**: ${query.query_type}
- **Response Time**: ${query.reply_time}ms

---`;
  })
  .join("\n")}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              // Navigate back to trigger revalidation
              window.location.reload();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

// View for adding domains
function AddDomainView() {
  const { pop } = useNavigation();

  const markdown = `
# ➕ Add Domain

To add a domain to Pi-hole lists, use the dedicated commands:

- **Raycast Command**: "Add Domain"
- **Available Lists**: Allowlist (whitelist) or Blocklist (blacklist)

This functionality is available as a separate command for easier access.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
