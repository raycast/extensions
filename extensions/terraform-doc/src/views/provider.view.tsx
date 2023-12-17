import { Action, ActionPanel, List, environment, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Provider, getProviderList } from "../lib/provider";
import ProviderVersionsView from "./provider-version.view";
import { hashColorizer } from "../lib/util";

export default function ProviderView() {
  const [state, setState] = useCachedState<Provider[]>(environment.extensionName + "-providers", [], {
    cacheNamespace: environment.extensionName + "-providers",
  });
  useEffect(() => {
    async function updateProviders() {
      try {
        if (state.length === 0) {
          await showToast({ title: "Loading Providers...", message: "This may take a minute." });
          setState(await getProviderList());
        }
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateProviders();
  }, []);
  return (
    <List isLoading={state.length === 0}>
      {state.map((p) => (
        <List.Item
          title={p.attributes["full-name"]}
          key={p.id}
          icon={p.attributes["logo-url"]}
          accessories={[{ tag: { color: hashColorizer(p.attributes.tier), value: p.attributes.tier } }]}
          actions={
            <ActionPanel>
              <Action.Push title={`Navigate to ${p.id}`} target={<ProviderVersionsView provider={p} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
