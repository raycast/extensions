import { Action, ActionPanel, Icon, List, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import ResourceView from "./resource.view";
import { Provider } from "../lib/provider";
import { ProviderVersion, getProviderVersionList } from "../lib/provider-version";

export default function ProviderVersionsView(props: { provider: Provider }) {
  const [state, setState] = useCachedState<ProviderVersion[]>(`${environment.extensionName}$-${props.provider.id}`, [], {
    cacheNamespace: `${environment.extensionName}$-${props.provider.id}`,
  });
  useEffect(() => {
    async function updateProviderVersions() {
      try {
        if (state.length === 0) setState(await getProviderVersionList(props.provider));
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateProviderVersions();
  }, []);
  return (
    <List isLoading={state.length === 0}>
      {state.map((p) => (
        <List.Item
          title={p.attributes.tag}
          key={p.id}
          icon={props.provider.attributes["logo-url"]}
          accessories={[{ tooltip: "Published at", icon: { source: Icon.Rocket }, date: p.attributes["published-at"] }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={`Navigate to ${p.id}`}
                target={<ResourceView provider={props.provider} version={p} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
