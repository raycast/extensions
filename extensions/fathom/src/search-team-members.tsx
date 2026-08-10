import { List, Icon, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { listTeamMembers, listTeams } from "./fathom/api";
import type { Paginated, TeamMember } from "./types/Types";
import { TeamMemberActions } from "./actions/TeamMemberActions";
import { useDebouncedValue } from "./utils/debounce";
import { hasApiKey, isApiKeyKnownInvalid } from "./fathom/auth";
import { classifyError, ErrorType, getUserFriendlyError } from "./utils/errorHandling";

function renderError(error: Error, onRefresh: () => void) {
  const errorType = classifyError(error);
  const isAuthError = errorType === ErrorType.API_KEY_MISSING || errorType === ErrorType.API_KEY_INVALID;

  return (
    <List.EmptyView
      icon={isAuthError ? Icon.Key : Icon.ExclamationMark}
      title={
        errorType === ErrorType.API_KEY_MISSING
          ? "API Key Required"
          : errorType === ErrorType.API_KEY_INVALID
            ? "Invalid API Key"
            : "Failed to Load Team Members"
      }
      description={
        isAuthError ? "Please check your Fathom API Key in Extension Preferences." : getUserFriendlyError(error).message
      }
      actions={
        <ActionPanel>
          {isAuthError && (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const [query, setQuery] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const debounced = useDebouncedValue(query, 300);

  // Early API key check — if missing, skip all API calls and show error view
  const apiKeyPresent = hasApiKey();

  // Fetch teams list separately — errors handled by useCachedPromise
  const { data: teamsData, error: teamsError } = useCachedPromise(async () => listTeams({}), [], {
    keepPreviousData: true,
    execute: apiKeyPresent,
  });

  const teams = useMemo(() => {
    return (teamsData?.items ?? []).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamsData]);

  // Fetch team members, optionally filtered by team — errors handled by useCachedPromise
  const {
    data: membersData,
    isLoading,
    error: membersError,
    revalidate,
  } = useCachedPromise(async (teamName: string) => listTeamMembers(teamName || undefined, {}), [selectedTeam], {
    keepPreviousData: true,
    execute: apiKeyPresent,
  });

  // Combine error sources: explicit missing key, teams error, or members error
  const error: Error | undefined = !apiKeyPresent
    ? new Error("API_KEY_MISSING: No API key configured. Please set your Fathom API Key in Extension Preferences.")
    : isApiKeyKnownInvalid()
      ? new Error("API_KEY_INVALID: Invalid API Key. Please check your Fathom API Key in Extension Preferences.")
      : membersError || teamsError;

  const page: Paginated<TeamMember> | undefined = membersData;

  const items = useMemo(() => {
    const raw = page?.items ?? [];
    const q = debounced.trim().toLowerCase();

    // Filter by search query
    if (q) {
      return raw.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.email ? m.email.toLowerCase().includes(q) : false),
      );
    }

    return raw;
  }, [page?.items, debounced]);

  // Group members by team (only when showing all teams)
  const groupedMembers = useMemo(() => {
    if (selectedTeam) {
      // If team is selected, show as single section
      return new Map([[selectedTeam, items]]);
    }

    // When showing all members, we don't have team info from API
    // So just show them ungrouped
    return new Map([["All Members", items]]);
  }, [items, selectedTeam]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search team members by name or email…"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        teams.length > 0 ? (
          <List.Dropdown tooltip="Filter by Team" value={selectedTeam} onChange={setSelectedTeam}>
            <List.Dropdown.Item title="All Teams" value="" />
            {teams.map((team) => (
              <List.Dropdown.Item key={team.id} title={team.name} value={team.name} icon={Icon.PersonLines} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        renderError(error, revalidate)
      ) : items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No Team Members Found"
          description={
            query
              ? `No team members match "${query}"`
              : "You may not be on a team, or your organization may not have teams set up."
          }
        />
      ) : (
        Array.from(groupedMembers.entries()).map(([teamName, members]) => (
          <List.Section
            key={teamName}
            title={teamName}
            subtitle={`${members.length} ${members.length === 1 ? "member" : "members"}`}
          >
            {members.map((tm) => (
              <List.Item
                key={tm.id}
                icon={Icon.Person}
                title={tm.name}
                subtitle={tm.email}
                accessories={[
                  tm.emailDomain ? { tag: { value: tm.emailDomain, color: "#8E8E93" } } : undefined,
                  tm.createdAt ? { text: new Date(tm.createdAt).toLocaleDateString(), icon: Icon.Calendar } : undefined,
                ].filter((x): x is NonNullable<typeof x> => x !== undefined)}
                actions={
                  <TeamMemberActions
                    member={tm}
                    onRefresh={revalidate}
                    allMembers={items}
                    teamName={selectedTeam || undefined}
                  />
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

export default Command;
