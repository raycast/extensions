import { FooterActions } from "./components/Footer";
import React from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { ToolResult } from "./components/ToolResult";
import { pick } from "./lib/format";
import { sectionLabel } from "./lib/theme";

function Keys() {
  return (
    <ToolList
      tool="list_api_keys"
      label="API keys"
      arrayKeys={["keys", "api_keys", "items"]}
      itemTitle={(o) => pick(o, ["label", "name", "key_prefix", "prefix"])}
      itemSubtitle={(o) => pick(o, ["key_prefix", "prefix"])}
      emptyTitle="No API keys"
      itemActions={(o) => {
        const id = Number(o.key_id ?? o.id);
        if (!Number.isFinite(id)) return null;
        return (
          <>
            <ToolAction
              tool="manage_api_keys"
              preset={{ action: "update_scopes", key_id: id }}
              form
              title="Change Scopes…"
              icon={Icon.Pencil}
            />
            <ToolAction tool="manage_api_keys" preset={{ action: "revoke", key_id: id }} title="Revoke Key" icon={Icon.Trash} />
          </>
        );
      }}
      listActions={() => <ToolAction tool="manage_api_keys" preset={{ action: "create" }} form title="Create API Key…" icon={Icon.Plus} />}
    />
  );
}

function Webhooks() {
  return (
    <ToolList
      tool="list_webhooks"
      label="Webhooks"
      arrayKeys={["webhooks", "destinations", "items"]}
      itemTitle={(o) => pick(o, ["label", "url", "name"])}
      itemSubtitle={(o) => pick(o, ["url"])}
      accessories={(o) =>
        o.active === false ? [{ tag: { value: "Paused", color: "#B7791F" } }] : [{ tag: { value: "Active", color: "#2F7D55" } }]
      }
      emptyTitle="No webhooks"
      itemActions={(o) => {
        const id = Number(o.webhook_id ?? o.id);
        if (!Number.isFinite(id)) return null;
        const act = (action: string, title: string, icon: Icon) => (
          <ToolAction tool="manage_webhooks" preset={{ action, webhook_id: id }} title={title} icon={icon} />
        );
        return (
          <>
            <ToolAction tool="list_webhooks" preset={{ webhook_id: id }} title="Recent Deliveries" icon={Icon.List} />
            {act("test", "Send Test Event", Icon.Bolt)}
            {act("pause", "Pause", Icon.Pause)}
            {act("resume", "Resume", Icon.Play)}
            {act("rotate_secret", "Rotate Signing Secret", Icon.Key)}
            <ToolAction tool="manage_webhooks" preset={{ action: "update", webhook_id: id }} form title="Update…" icon={Icon.Pencil} />
            <ToolAction
              tool="manage_webhooks"
              preset={{ action: "retry_delivery", webhook_id: id }}
              form
              title="Retry a Delivery…"
              icon={Icon.ArrowClockwise}
            />
            {act("delete", "Delete Webhook", Icon.Trash)}
          </>
        );
      }}
      listActions={() => (
        <>
          <ToolAction tool="manage_webhooks" preset={{ action: "create" }} form title="Create Webhook…" icon={Icon.Plus} />
          <ToolAction tool="create_webhook" form title="Create Webhook (simple)…" icon={Icon.Plus} />
        </>
      )}
    />
  );
}

export default function Command() {
  const rows: { title: string; subtitle: string; icon: Icon; target: React.ReactElement }[] = [
    {
      title: "REST API v1 Status",
      subtitle: "Plan, scopes, budgets, usage",
      icon: Icon.Gauge,
      target: <ToolResult toolName="get_api_status" />,
    },
    { title: "API Keys", subtitle: "Create, re-scope, revoke", icon: Icon.Key, target: <Keys /> },
    { title: "Webhooks", subtitle: "Manage destinations and deliveries", icon: Icon.Link, target: <Webhooks /> },
  ];
  return (
    <List>
      <List.Section title={sectionLabel("Developer")}>
        {rows.map((r) => (
          <List.Item
            key={r.title}
            title={r.title}
            subtitle={r.subtitle}
            icon={r.icon}
            actions={
              <ActionPanel>
                <Action.Push title="Open" target={r.target} />
                <FooterActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
