import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
  popToRoot,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { StoreBrowser } from "./components/store-browser";
import { listStoreAccess } from "./lib/store";
import {
  disconnectStore,
  signInToStore,
  StoreSignInRequired,
} from "./lib/store-auth";

export default function Command() {
  const [accountRevision, setAccountRevision] = useState(0);
  // A new account must never inherit another account's team selection/results.
  return (
    <TeamStore
      key={accountRevision}
      onAccountChange={() => setAccountRevision((revision) => revision + 1)}
    />
  );
}

function TeamStore({ onAccountChange }: { onAccountChange: () => void }) {
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>();
  const {
    data: access,
    isLoading,
    error,
    revalidate,
  } = usePromise(listStoreAccess, [], {
    // Expected expired-session errors open Raycast's native connection screen.
    onError() {},
  });
  const organizations = access?.organizations ?? [];
  const selectedStore =
    organizations.find((org) => org.id === selectedStoreId) ??
    (organizations.length === 1 ? organizations[0] : undefined);
  const needsSignIn =
    requiresSignIn ||
    error instanceof StoreSignInRequired ||
    (!isLoading && !error && !access?.signedIn);
  const subtitle = needsSignIn
    ? "Sign in to Glaze"
    : error || !access
      ? null
      : (selectedStore?.name ?? `${organizations.length} team stores`);

  useEffect(() => {
    // Root-search titles are fixed in the manifest; only subtitles can change.
    void updateCommandMetadata({ subtitle }).catch((error: unknown) => {
      console.error("Could not update team store subtitle", error);
    });
  }, [subtitle]);

  const requestSignIn = useCallback(() => setRequiresSignIn(true), []);

  async function signOut() {
    try {
      await disconnectStore();
      await updateCommandMetadata({ subtitle: "Sign in to Glaze" }).catch(
        (error: unknown) =>
          console.error("Could not clear team store subtitle", error),
      );
      // Leave the command instead of immediately starting another login.
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't disconnect",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const accountActions = (
    <ActionPanel.Section title="Account">
      {organizations.length > 1 && (
        <ActionPanel.Submenu title="Switch Team" icon={Icon.TwoPeople}>
          {organizations.map((org) => (
            <Action
              key={org.id}
              title={org.name}
              icon={
                org.id === selectedStore?.id
                  ? Icon.Checkmark
                  : org.avatar_url || Icon.TwoPeople
              }
              onAction={() => setSelectedStoreId(org.id)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action
        title="Disconnect Store Account"
        icon={Icon.Logout}
        onAction={signOut}
      />
    </ActionPanel.Section>
  );

  if (isLoading && !access && !error) {
    return <List isLoading navigationTitle="Browse Team Store" />;
  }

  if (needsSignIn) {
    return <StoreSignIn onConnected={onAccountChange} />;
  }

  if (error) {
    return (
      <List navigationTitle="Browse Team Store" isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Team Stores"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={async () => {
                  await revalidate();
                }}
              />
              {accountActions}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (selectedStore) {
    return (
      <StoreBrowser
        key={selectedStore.id}
        storeId={selectedStore.id}
        storeName={selectedStore.name}
        accountActions={accountActions}
        onRefresh={revalidate}
        onSignInRequired={requestSignIn}
      />
    );
  }

  return (
    <List
      navigationTitle="Browse Team Store"
      searchBarPlaceholder="Choose your team…"
      isLoading={isLoading}
    >
      <List.EmptyView
        icon={Icon.TwoPeople}
        title={
          organizations.length
            ? "No Matching Teams"
            : "No Team Stores Available"
        }
        description={
          organizations.length
            ? "Try another team name."
            : "This Glaze account doesn't have access to a team store. Ask your team for an invitation, or sign in with another account."
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh Team Stores"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                await revalidate();
              }}
            />
            {accountActions}
          </ActionPanel>
        }
      />
      {organizations.map((org) => (
        <List.Item
          key={org.id}
          title={org.name}
          icon={org.avatar_url || Icon.TwoPeople}
          actions={
            <ActionPanel>
              <Action
                title="Browse Store"
                onAction={() => setSelectedStoreId(org.id)}
              />
              {accountActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function StoreSignIn({ onConnected }: { onConnected: () => void }) {
  const { signInProvider = "google" } =
    getPreferenceValues<Preferences.BrowseTeamStore>();
  // authorize() supplies the login UI. Start once on mount; retry only after an
  // explicit action so cancelling/failing doesn't reopen the overlay in a loop.
  const { isLoading, error, revalidate } = usePromise(
    signInToStore,
    [signInProvider],
    {
      onData: onConnected,
      onError() {},
    },
  );

  return (
    <List navigationTitle="Browse Team Store" isLoading={isLoading || !error}>
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Sign-In Not Completed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={async () => {
                  await revalidate();
                }}
              />
              <Action
                title="Change Sign-In Method"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
