import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { GroupedRoute } from "../types";
import { getMethodIcon, getMethodTagColor } from "../helper";

interface ListItemProps {
  groupedRoute: GroupedRoute;
  controller: string;
  port: string;
}

function RouteListItem({ groupedRoute, controller, port }: ListItemProps) {
  return (
    <List.Item
      key={groupedRoute.path}
      title={groupedRoute.path}
      subtitle={groupedRoute.methods[0].urlHelper !== "N/A" ? `${groupedRoute.methods[0].urlHelper}_path` : undefined}
      keywords={[
        controller,
        groupedRoute.path,
        ...groupedRoute.methods.map((r) => [r.action, r.method, r.urlHelper]).flat(),
      ]}
      accessories={[
        ...groupedRoute.methods.map((route) => ({
          tag: {
            value: route.method,
            color: getMethodTagColor(route.method),
          },
          tooltip: `${route.method} ${route.controller}#${route.action}`,
        })),
      ]}
      icon={
        groupedRoute.methods.length === 1
          ? getMethodIcon(groupedRoute.methods[0].method)
          : { source: Icon.List, tintColor: Color.PrimaryText }
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Path" text={groupedRoute.path} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="HTTP Methods"
                text={groupedRoute.methods.map((r) => r.method).join(", ")}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Actions" />
              {groupedRoute.methods.map((route, idx) => (
                <List.Item.Detail.Metadata.Label
                  key={idx}
                  title={route.method}
                  text={`${route.controller}#${route.action}`}
                />
              ))}
              {groupedRoute.methods[0].urlHelper !== "N/A" && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="URL Helper"
                    text={`${groupedRoute.methods[0].urlHelper}_path`}
                  />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {groupedRoute.methods[0].urlHelper !== "N/A" && (
              <Action.CopyToClipboard title="Copy URL Helper" content={`${groupedRoute.methods[0].urlHelper}_path`} />
            )}
            <Action.CopyToClipboard title="Copy Path" content={groupedRoute.path} />
            <Action.OpenInBrowser url={`http://127.0.0.1:${port}${groupedRoute.path}`} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy Controller Actions">
            <Action title="Change Port" icon={Icon.Switch} onAction={openExtensionPreferences} />
            {groupedRoute.methods.map((route, idx) => (
              <Action.CopyToClipboard
                key={idx}
                title={`Copy ${route.method} Action`}
                content={`${route.controller}#${route.action}`}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default RouteListItem;
