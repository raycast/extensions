import { Action, ActionPanel, List } from "@raycast/api";
import ResourceDetailView from "./resource-detail.view";
import { toResourceDocUrl, toResourceRawDocUrl } from "../lib/resource-detail";
import { hashColorizer } from "../lib/util";
import { useEffect } from "react";
import { useResourceHistoriesState, updateHistories } from "../lib/history";

export default function HistoryView() {
  const [resHistories, setResHistories] = useResourceHistoriesState();
  useEffect(() => {
    setResHistories(resHistories);
  }, [resHistories]);
  return (
    <List>
      {resHistories.map((r) => (
        <List.Item
          icon={r.provider.attributes["logo-url"]}
          title={r.resource.attributes.title}
          key={`${r.provider.id}/${r.version.id}/${r.resource.id}`}
          keywords={[
            r.resource.attributes.subcategory ?? "",
            r.resource.attributes.category,
            r.resource.attributes.title,
          ]}
          accessories={[
            {
              tag: {
                color: hashColorizer(r.version.attributes.version ?? ""),
                value: r.version.attributes.version ?? "default",
              },
              tooltip: "Version",
            },
            {
              tag: {
                color: hashColorizer(r.resource.attributes.subcategory ?? ""),
                value: r.resource.attributes.subcategory ?? "default",
              },
              tooltip: "Category",
            },
            {
              tag: {
                color: hashColorizer(r.resource.attributes.category ?? ""),
                value: r.resource.attributes.category ?? "default",
              },
              tooltip: "Resource Type",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                onPush={() => {
                  updateHistories(
                    {
                      provider: r.provider,
                      version: r.version,
                      resource: r.resource,
                    },
                    resHistories,
                    setResHistories,
                  );
                }}
                title={`Navigate to ${r.resource.attributes.title}`}
                target={
                  <ResourceDetailView
                    provider={r.provider}
                    version={r.version}
                    resource={r.resource}
                  />
                }
              ></Action.Push>
              <Action.OpenInBrowser
                title={`Open in Browser`}
                url={toResourceDocUrl(r.provider, r.version, r.resource)}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
              />
              <Action.OpenInBrowser
                title={`Open Raw Doc in Browser`}
                url={toResourceRawDocUrl(r.provider, r.version, r.resource)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
