import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { MissingTokenView } from "./components/MissingTokenView";
import { accountDisplayName, formatAmount, statusColor, statusText } from "./lib/format";
import { showStarlingErrorToast } from "./lib/errors";
import { getResolvedPreferences } from "./lib/preferences";
import { StarlingApiError, getAccounts, getSpaces } from "./lib/starling";
import { StarlingAccount, StarlingSpace } from "./lib/types";

type SpaceRecord = {
  account: StarlingAccount;
  space: StarlingSpace;
};

type SpaceLoadError = {
  accountUid: string;
  accountName: string;
  message: string;
  status?: number;
};

type SpacesLoadResult = {
  spaces: SpaceRecord[];
  errors: SpaceLoadError[];
};

function toSpaceLoadError(account: StarlingAccount, error: unknown): SpaceLoadError {
  if (error instanceof StarlingApiError) {
    return {
      accountUid: account.accountUid,
      accountName: accountDisplayName(account),
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      accountUid: account.accountUid,
      accountName: accountDisplayName(account),
      message: error.message,
    };
  }

  return {
    accountUid: account.accountUid,
    accountName: accountDisplayName(account),
    message: "Unknown spaces API error",
  };
}

async function loadSpacesAcrossAccounts(): Promise<SpacesLoadResult> {
  const accounts = await getAccounts();
  const all = await Promise.all(
    accounts.map(async (account) => {
      try {
        const spaces = await getSpaces(account.accountUid);
        return {
          spaces: spaces.map((space) => ({ account, space })),
          error: undefined,
        };
      } catch (error) {
        return {
          spaces: [],
          error: toSpaceLoadError(account, error),
        };
      }
    }),
  );

  return {
    spaces: all.flatMap((entry) => entry.spaces),
    errors: all.flatMap((entry) => (entry.error ? [entry.error] : [])),
  };
}

function spaceUid(space: StarlingSpace): string {
  return space.spaceUid || space.savingsGoalUid || space.categoryUid || "unknown-space";
}

function spaceDisplayName(space: StarlingSpace): string {
  return space.name || "Space";
}

function SpaceDetail(props: { record: SpaceRecord; defaultCurrency: string; onReload: () => void }) {
  const { record, defaultCurrency, onReload } = props;
  const { account, space } = record;
  const balanceText = formatAmount(space.balance, account.currency ?? defaultCurrency);

  return (
    <Detail
      navigationTitle={spaceDisplayName(space)}
      markdown={[
        `# ${spaceDisplayName(space)}`,
        "",
        `**Balance:** ${balanceText}`,
        "",
        `**Status:** ${statusText(space.state)}`,
      ].join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Account" text={accountDisplayName(account)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Reload Spaces" icon={Icon.ArrowClockwise} onAction={onReload} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function SpacesCommand() {
  const preferences = getResolvedPreferences();
  const [selectedAccountUid, setSelectedAccountUid] = useState("all");

  const { data, isLoading, error, revalidate } = useCachedPromise(loadSpacesAcrossAccounts, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      void showStarlingErrorToast(error, "Failed to load spaces");
    }
  }, [error]);

  const spaces = data?.spaces ?? [];
  const loadErrors = data?.errors ?? [];

  const accountOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of spaces) {
      map.set(record.account.accountUid, accountDisplayName(record.account));
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [spaces]);

  const filtered =
    selectedAccountUid === "all" ? spaces : spaces.filter((record) => record.account.accountUid === selectedAccountUid);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search spaces by name or status"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by account" value={selectedAccountUid} onChange={setSelectedAccountUid}>
          <List.Dropdown.Item title="All Accounts" value="all" />
          {accountOptions.map(([uid, name]) => (
            <List.Dropdown.Item key={uid} title={name} value={uid} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Spaces" subtitle={String(filtered.length)}>
        {filtered.map((record) => {
          const { account, space } = record;
          const uid = spaceUid(space);
          const balanceText = formatAmount(space.balance, account.currency ?? preferences.defaultCurrency);

          return (
            <List.Item
              key={`${account.accountUid}-${uid}`}
              icon={Icon.CircleProgress100}
              title={spaceDisplayName(space)}
              subtitle={accountDisplayName(account)}
              keywords={[space.name || "", space.goalType || "", space.state || ""]}
              accessories={[
                {
                  tag: {
                    value: balanceText,
                    color: statusColor(space.state),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={
                      <SpaceDetail
                        record={record}
                        defaultCurrency={preferences.defaultCurrency}
                        onReload={revalidate}
                      />
                    }
                  />
                  <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!isLoading && filtered.length === 0 ? (
        <List.EmptyView
          title="No spaces found"
          description={
            loadErrors.length > 0
              ? "Could not load spaces for one or more accounts."
              : "No spaces are available for this account."
          }
        />
      ) : null}
    </List>
  );
}

export default function Command() {
  const preferences = getResolvedPreferences();

  if (!preferences.personalAccessToken && !preferences.useDemoData) {
    return <MissingTokenView />;
  }

  return <SpacesCommand />;
}
