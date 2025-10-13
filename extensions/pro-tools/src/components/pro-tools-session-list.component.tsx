import { List } from "@raycast/api";
import { ProToolsSessionListItem } from "./pro-tools-session-list-item.component";
import { useCachedPromise } from "@raycast/utils";
import { ProToolsSessionService } from "../services/pro-tools-session.service";
import { ProToolsFavoriteSessionService } from "../services/pro-tools-favorite-session.service";
import { ProToolsSession } from "../models/pro-tools-session.model";
import React, { useState } from "react";

export function ProToolsSessionList(props: {
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  actions?: (proToolsSession: ProToolsSession) => React.ReactNode;
}): React.ReactElement {
  const proToolsSessionsState = useCachedPromise(
    ProToolsSessionService.proToolsSessions,
  );

  const favoriteProToolsSessionsState = useCachedPromise(
    ProToolsFavoriteSessionService.favorites,
  );

  // The sessions are already sorted by modification date in the service layer
  // We'll use a custom filtering approach that preserves the original order

  // Filter favorite sessions while preserving original order
  const favoriteProToolsSessions = proToolsSessionsState.data?.filter(
    (proToolsSession) =>
      favoriteProToolsSessionsState.data?.includes(proToolsSession.filePath),
  );

  // Filter regular sessions while preserving original order
  const proToolsSessions = proToolsSessionsState.data?.filter(
    (proToolsSession) =>
      !favoriteProToolsSessionsState.data?.includes(proToolsSession.filePath),
  );

  // Custom search filtering implementation that preserves sort order
  const [searchText, setSearchText] = useState("");

  // Filter sessions based on search text while preserving the original sort order
  const filterBySearchText = (sessions: ProToolsSession[] | undefined) => {
    if (!sessions) return [];
    if (!searchText) return sessions;

    const lowerSearchText = searchText.toLowerCase();
    return sessions.filter((session) => {
      return (
        session.name.toLowerCase().includes(lowerSearchText) ||
        session.filePath.toLowerCase().includes(lowerSearchText)
      );
    });
  };

  // Apply search filtering while preserving the original sort order
  const filteredFavorites = filterBySearchText(favoriteProToolsSessions);
  const filteredSessions = filterBySearchText(proToolsSessions);

  return (
    <List
      navigationTitle={props.navigationTitle}
      isLoading={proToolsSessionsState.isLoading}
      searchBarPlaceholder={
        props.searchBarPlaceholder ?? "Search for Pro Tools Sessions"
      }
      onSearchTextChange={setSearchText}
      searchText={searchText}
      enableFiltering={false} // Disable Raycast's built-in filtering
    >
      <List.Section title="Favorites">
        {filteredFavorites.map((proToolsSession) => (
          <ProToolsSessionListItemContainer
            key={proToolsSession.filePath}
            proToolsSession={proToolsSession}
            isFavorite={true}
            actions={props.actions}
            revalidate={favoriteProToolsSessionsState.revalidate}
          />
        ))}
      </List.Section>

      <List.Section
        title={filteredFavorites.length ? "Recent Sessions" : undefined}
      >
        {filteredSessions.map((proToolsSession) => (
          <ProToolsSessionListItemContainer
            key={proToolsSession.filePath}
            proToolsSession={proToolsSession}
            isFavorite={false}
            actions={props.actions}
            revalidate={favoriteProToolsSessionsState.revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ProToolsSessionListItemContainer(props: {
  proToolsSession: ProToolsSession;
  isFavorite: boolean;
  actions?: (proToolsSession: ProToolsSession) => React.ReactNode;
  revalidate: () => void;
}): React.ReactElement {
  return (
    <ProToolsSessionListItem
      session={props.proToolsSession}
      isFavorite={props.isFavorite}
      actions={props.actions?.(props.proToolsSession)}
      onToggleFavoriteAction={async () => {
        if (props.isFavorite) {
          await ProToolsFavoriteSessionService.removeFromFavorites(
            props.proToolsSession,
          );
        } else {
          await ProToolsFavoriteSessionService.addToFavorites(
            props.proToolsSession,
          );
        }
        props.revalidate();
      }}
    />
  );
}
