import { Action, ActionPanel, Icon, List, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import ResourceView from "./resource.view";
import { Provider } from "../lib/provider";
import {
  ProviderVersion,
  getProviderVersionList,
} from "../lib/provider-version";

export default function ProviderVersionsView(props: { provider: Provider }) {
  const [state, setState] = useCachedState<ProviderVersion[] | undefined>(
    `provider-versions of ${props.provider.id}`,
    undefined,
    {
      cacheNamespace: `${environment.extensionName}$`,
    },
  );
  useEffect(() => {
    async function updateProviderVersions() {
      try {
        if (!state) setState(await getProviderVersionList(props.provider));
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateProviderVersions();
  }, [state]);
  return (
    <List isLoading={!(state && state.length > 0)}>
      {state?.map((p) => (
        <List.Item
          title={p.attributes.tag}
          key={p.id}
          icon={props.provider.attributes["logo-url"]}
          accessories={[
            {
              tooltip: "Published at",
              icon: { source: Icon.Rocket },
              date: p.attributes["published-at"],
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Hourglass}
                title={`Navigate to ${p.attributes.tag}`}
                target={<ResourceView provider={props.provider} version={p} />}
              />
              <Action
                icon={Icon.Download}
                title="Refresh Cached Releases"
                onAction={() => setState(undefined)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
