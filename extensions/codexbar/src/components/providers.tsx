import { Action, ActionPanel, Color, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { createDeeplink, useCachedPromise } from "@raycast/utils";
import { EMPTY_PREFS, ProviderPrefs, moveProvider, orderedIds, parsePrefs, toggleHidden } from "../lib/provider-prefs";

const PREFS_KEY = "provider-prefs";

export function useProviderPrefs() {
  const { data, mutate, revalidate, isLoading } = useCachedPromise(
    async () => parsePrefs(await LocalStorage.getItem<string>(PREFS_KEY)),
    [],
    { keepPreviousData: true },
  );
  async function save(next: ProviderPrefs) {
    await mutate(LocalStorage.setItem(PREFS_KEY, JSON.stringify(next)), {
      optimisticUpdate: () => next,
      shouldRevalidateAfter: false,
    });
  }
  return { prefs: data ?? EMPTY_PREFS, save, revalidate, isLoading };
}

interface ProviderRef {
  provider: string;
  name: string;
}

export function CreateQuicklinkAction(props: ProviderRef) {
  return (
    <Action.CreateQuicklink
      title={`Create Quicklink for ${props.name}`}
      quicklink={{
        name: `CodexBar ${props.name}`,
        link: createDeeplink({ command: "usage-overview", context: { provider: props.provider } }),
      }}
    />
  );
}

/** Opens the layout editor and refreshes the caller's layout when it closes. */
export function ManageProvidersAction(props: { providers: ProviderRef[]; onChange: () => void }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Manage Providers"
      icon={Icon.AppWindowList}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={() => push(<ManageProviders providers={props.providers} />, props.onChange)}
    />
  );
}

function ManageProviders(props: { providers: ProviderRef[] }) {
  const { prefs, save, isLoading } = useProviderPrefs();
  const available = props.providers.map((p) => p.provider);
  const byId = new Map(props.providers.map((p) => [p.provider, p]));
  const order = orderedIds(prefs, available);

  return (
    <List isLoading={isLoading} navigationTitle="Manage Providers" searchBarPlaceholder="Filter providers">
      <List.EmptyView
        icon={Icon.AppWindowList}
        title="No Providers"
        description="Enable providers in CodexBar first."
      />
      <List.Section title="Shown top to bottom" subtitle="↵ show or hide · ⌘⌥↑↓ reorder">
        {order.map((id, index) => {
          const provider = byId.get(id);
          if (!provider) return null;
          const hidden = prefs.hidden.includes(id);
          return (
            <List.Item
              key={id}
              title={provider.name}
              icon={
                hidden
                  ? { source: Icon.Circle, tintColor: Color.SecondaryText }
                  : { source: Icon.CheckCircle, tintColor: Color.Green }
              }
              accessories={[{ text: hidden ? "Hidden" : `#${index + 1}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title={hidden ? "Show in Dashboard" : "Hide from Dashboard"}
                    icon={hidden ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() => save(toggleHidden(prefs, id))}
                  />
                  <CreateQuicklinkAction {...provider} />
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() => save(moveProvider(prefs, available, id, -1))}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() => save(moveProvider(prefs, available, id, 1))}
                  />
                  <Action
                    title="Reset Layout"
                    icon={Icon.RotateAntiClockwise}
                    style={Action.Style.Destructive}
                    onAction={() => save(EMPTY_PREFS)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
