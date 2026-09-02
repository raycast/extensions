import { useHAStates } from "@components/hooks";
import { useEntityOverrides } from "@lib/entity-overrides";
import { getDisplayName, getFriendlyName } from "@lib/utils";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React, { useMemo } from "react";

export default function EntitySettingsCommand() {
  const { states, isLoading } = useHAStates();
  const { hiddenEntities, entityAliases, favoriteEntities, showEntity, clearAlias, removeFavorite } =
    useEntityOverrides();

  const statesById = useMemo(() => new Map((states ?? []).map((state) => [state.entity_id, state])), [states]);

  const aliasEntries = useMemo(
    () => Object.entries(entityAliases).sort(([, a], [, b]) => a.localeCompare(b)),
    [entityAliases],
  );

  const sortedHiddenEntities = useMemo(
    () =>
      [...hiddenEntities].sort((a, b) => {
        const stateA = statesById.get(a);
        const stateB = statesById.get(b);
        const nameA = stateA ? getFriendlyName(stateA) : a;
        const nameB = stateB ? getFriendlyName(stateB) : b;
        return nameA.localeCompare(nameB);
      }),
    [hiddenEntities, statesById],
  );

  const sortedFavoriteEntities = useMemo(
    () =>
      [...favoriteEntities].sort((a, b) => {
        const stateA = statesById.get(a);
        const stateB = statesById.get(b);
        const nameA = stateA ? getDisplayName(stateA, entityAliases[a]) : a;
        const nameB = stateB ? getDisplayName(stateB, entityAliases[b]) : b;
        return nameA.localeCompare(nameB);
      }),
    [favoriteEntities, statesById, entityAliases],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter entities...">
      <List.Section title="Favorites" subtitle={`${sortedFavoriteEntities.length}`}>
        {sortedFavoriteEntities.length === 0 ? (
          <List.Item title="No Favorites" icon={Icon.Star} />
        ) : (
          sortedFavoriteEntities.map((entityId) => {
            const state = statesById.get(entityId);
            const title = state ? getDisplayName(state, entityAliases[entityId]) : entityId;
            return (
              <List.Item
                key={entityId}
                title={title}
                subtitle={entityId}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Favorites">
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
                        onAction={() => removeFavorite(entityId)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
      <List.Section title="Hidden Entities" subtitle={`${sortedHiddenEntities.length}`}>
        {sortedHiddenEntities.length === 0 ? (
          <List.Item title="No Hidden Entities" icon={Icon.Eye} />
        ) : (
          sortedHiddenEntities.map((entityId) => {
            const state = statesById.get(entityId);
            const friendlyName = state ? getFriendlyName(state) : entityId;
            return (
              <List.Item
                key={entityId}
                title={friendlyName}
                subtitle={entityId}
                icon={{ source: Icon.EyeDisabled, tintColor: Color.SecondaryText }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Visibility">
                      <Action title="Show Entity" icon={Icon.Eye} onAction={() => showEntity(entityId)} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
      <List.Section title="Custom Names" subtitle={`${aliasEntries.length}`}>
        {aliasEntries.length === 0 ? (
          <List.Item title="No Custom Names" icon={Icon.Pencil} />
        ) : (
          aliasEntries.map(([entityId, alias]) => {
            const state = statesById.get(entityId);
            const originalName = state ? getFriendlyName(state) : entityId;
            return (
              <List.Item
                key={entityId}
                title={alias}
                subtitle={`${originalName} · ${entityId}`}
                icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Customization">
                      <Action
                        title="Remove Custom Name"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => clearAlias(entityId)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}
