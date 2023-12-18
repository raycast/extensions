import { Action, ActionPanel, Icon, List, environment } from "@raycast/api";
import { Provider } from "../lib/provider";
import { ProviderVersion } from "../lib/provider-version";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Resource, getResourceList } from "../lib/resource";
import { hashColorizer } from "../lib/util";
import ResourceDetailView from "./resource-detail.view";
import { toResourceRawDocUrl, toResourceDocUrl } from "../lib/resource-detail";

export default function ResourceView(prop: {
  provider: Provider;
  version: ProviderVersion;
}) {
  const [state, setState] = useCachedState<Resource[] | undefined>(
    `${environment.extensionName}$-${prop.provider.id}-${prop.version.attributes.version}`,
    [],
    {
      cacheNamespace: `${environment.extensionName}-${prop.provider.id}-${prop.version.attributes.version}`,
    },
  );
  useEffect(() => {
    async function updateResouceList() {
      try {
        if (state && state.length === 0) {
          const res = await getResourceList(prop.provider, prop.version);
          setState(res);
        }
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateResouceList();
  }, []);
  return (
    <List isLoading={state && state.length === 0}>
      {state ? (
        state?.map((r) => (
          <List.Item
            title={r.attributes.title}
            key={r.id}
            keywords={[
              r.attributes.subcategory ?? "",
              r.attributes.category,
              r.attributes.title,
            ]}
            accessories={[
              {
                tag: {
                  color: hashColorizer(r.attributes.subcategory ?? ""),
                  value: r.attributes.subcategory ?? "",
                },
              },
              {
                tag: {
                  color: hashColorizer(r.attributes.category ?? ""),
                  value: r.attributes.category ?? "",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Navigate to ${r.attributes.title}`}
                  target={
                    <ResourceDetailView
                      url={toResourceRawDocUrl(prop.provider, prop.version, r)}
                    />
                  }
                ></Action.Push>
                <Action.OpenInBrowser
                  title={`Open in Browser`}
                  url={toResourceDocUrl(prop.provider, prop.version, r)}
                />
                <Action.OpenInBrowser
                  title={`Open Raw Doc in Browser`}
                  url={toResourceRawDocUrl(prop.provider, prop.version, r)}
                />
              </ActionPanel>
            }
          ></List.Item>
        ))
      ) : (
        <List.Item
          title="Oops, it looks like the documentation doesn't exist"
          icon={Icon.Info}
        ></List.Item>
      )}
    </List>
  );
}
