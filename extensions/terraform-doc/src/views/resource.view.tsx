import { Action, ActionPanel, List, environment } from "@raycast/api";
import { Provider } from "../lib/provider";
import { ProviderVersion } from "../lib/provider-version";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Resource, getResourceList } from "../lib/resource";
import { hashColorizer } from "../lib/util";

export default function ResourceView(prop: {
  provider: Provider;
  version: ProviderVersion;
}) {
  const [state, setState] = useCachedState<Resource[]>(
    `${environment.extensionName}$-${prop.provider.id}-${prop.version.attributes.version}`,
    [],
    {
      cacheNamespace: `${environment.extensionName}-${prop.provider.id}-${prop.version.attributes.version}`,
    },
  );
  useEffect(() => {
    async function updateResouceList() {
      try {
        if (state.length === 0) {
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
    <List isLoading={state.length === 0}>
      {state.map((r) => (
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
              <Action.OpenInBrowser
                title={`Open in Browser`}
                url={`https://registry.terraform.io/providers/${prop.provider.attributes["full-name"]}/${prop.version.attributes.version}/docs/${r.attributes.category}/${r.attributes.title}`}
              />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
