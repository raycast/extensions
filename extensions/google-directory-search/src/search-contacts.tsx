import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  popToRoot,
  showToast,
} from "@raycast/api";
import { OAuthService, getAccessToken, showFailureToast, withAccessToken } from "@raycast/utils";
import {
  Contact,
  ContactStore,
  Favorites,
  Usage,
  allContacts,
  loadFavorites,
  loadStore,
  loadUsage,
  saveFavorites,
  saveStore,
  saveUsage,
  sortContacts,
  syncContacts,
} from "./contacts";

// Trim so a stray space/newline from copy-pasting the Client ID doesn't break
// auth, and check the format up front: a Google OAuth Client ID always ends in
// `.apps.googleusercontent.com`, which catches pasting the client secret, the
// project number, or a truncated value far better than a length check.
const clientId = getPreferenceValues<{ clientId: string }>().clientId.trim();
if (!clientId.endsWith(".apps.googleusercontent.com")) {
  throw new Error(
    "Invalid Google OAuth Client ID. It should end with '.apps.googleusercontent.com'. Update it in the extension preferences (see the README setup).",
  );
}

const google = OAuthService.google({
  clientId,
  scope:
    "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/directory.readonly",
});

const EMPTY_STORE: ContactStore = { contacts: [], directory: [] };

/**
 * Clear the stored OAuth tokens so the next launch re-runs Google's consent
 * flow. Needed after the requested scopes change (e.g. adding directory access):
 * Raycast keeps reusing the old token otherwise, and the directory API rejects
 * it with 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT.
 */
async function reauthenticate() {
  await google.client.removeTokens();
  await showToast({
    style: Toast.Style.Success,
    title: "Signed out of Google",
    message: "Reopen Search Contacts and Directory to grant the new permissions.",
  });
  await popToRoot();
}

/**
 * Cache-then-refresh: show the contacts persisted on disk immediately, then
 * sync with Google in the background (incrementally when we have sync tokens).
 *
 * Display order is most-recently-used first, then alphabetical; usage is
 * recorded whenever a contact's email or name is pasted/copied.
 */
function useContacts(token: string) {
  const [store, setStore] = useState<ContactStore>(EMPTY_STORE);
  const [usage, setUsage] = useState<Usage>({});
  const [favorites, setFavorites] = useState<Favorites>({});
  const [isLoading, setIsLoading] = useState(true);
  // Kept in sync with `store` so `revalidate` always reads the latest base.
  const storeRef = useRef(store);
  storeRef.current = store;

  const contacts = useMemo(
    () => sortContacts(allContacts(store), usage, favorites),
    [store, usage, favorites],
  );

  const revalidate = useCallback(
    async (full = false) => {
      setIsLoading(true);
      try {
        // A full refresh drops the sync tokens to re-fetch the whole list.
        const current = storeRef.current;
        const base: ContactStore = full
          ? { contacts: current.contacts, directory: current.directory }
          : current;
        const next = await syncContacts(token, base);
        setStore(next);
        await saveStore(next);
      } catch (error) {
        await showFailureToast(error, { title: "Could not sync contacts" });
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cached, cachedUsage, cachedFavorites] = await Promise.all([
        loadStore(),
        loadUsage(),
        loadFavorites(),
      ]);
      if (cancelled) return;
      setStore(cached); // instant: render whatever we cached last time
      setUsage(cachedUsage);
      setFavorites(cachedFavorites);
      await revalidate(); // then catch up with Google
    })();
    return () => {
      cancelled = true;
    };
  }, [revalidate]);

  const markUsed = useCallback((id: string) => {
    setUsage((prev) => {
      const next = { ...prev, [id]: Date.now() };
      void saveUsage(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      void saveFavorites(next);
      return next;
    });
  }, []);

  return { contacts, favorites, isLoading, revalidate, markUsed, toggleFavorite };
}

function ContactActions({
  contact,
  isFavorite,
  onToggleFavorite,
  onRefresh,
  onUse,
}: {
  contact: Contact;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRefresh: () => void;
  onUse: () => void;
}) {
  const [primary, ...others] = contact.emails;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primary && (
          <Action.Paste
            title="Paste Email"
            content={primary}
            icon={Icon.Envelope}
            onPaste={onUse}
          />
        )}
        {primary && (
          <Action.CopyToClipboard
            title="Copy Email"
            content={primary}
            icon={Icon.Envelope}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={onUse}
          />
        )}
      </ActionPanel.Section>
      {others.length > 0 && (
        <ActionPanel.Section title="Other Emails">
          {others.map((email) => (
            <Action.Paste
              key={email}
              title={`Paste ${email}`}
              content={email}
              icon={Icon.Envelope}
              onPaste={onUse}
            />
          ))}
        </ActionPanel.Section>
      )}
      {contact.name && (
        <ActionPanel.Section title="Name">
          <Action.Paste
            title="Paste Name"
            content={contact.name}
            icon={Icon.Person}
            onPaste={onUse}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={contact.name}
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onCopy={onUse}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action
          title={isFavorite ? "Unpin Contact" : "Pin Contact"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          onAction={onToggleFavorite}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
        <Action
          title="Refresh Contacts"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          title="Re-Authenticate with Google"
          icon={Icon.Key}
          onAction={reauthenticate}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function SearchContacts() {
  const { token } = getAccessToken();
  const { contacts, favorites, isLoading, revalidate, markUsed, toggleFavorite } =
    useContacts(token);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name or email…">
      <List.EmptyView
        icon={Icon.Person}
        title={isLoading ? "Loading contacts…" : "No contacts found"}
        description={isLoading ? undefined : "Press ⌘R to refresh from Google."}
      />
      {contacts.map((contact) => {
        const primary = contact.emails[0];
        const isFavorite = Boolean(favorites[contact.id]);
        const keywords = [...contact.emails, contact.givenName, contact.familyName].filter(
          (value): value is string => Boolean(value),
        );
        const accessories: List.Item.Accessory[] = [];
        if (contact.emails.length > 1) accessories.push({ tag: `${contact.emails.length} emails` });
        if (isFavorite) accessories.push({ icon: Icon.Star, tooltip: "Pinned" });
        return (
          <List.Item
            key={contact.id}
            icon={Icon.Person}
            title={contact.name || primary || "Unknown"}
            subtitle={primary ?? ""}
            keywords={keywords}
            accessories={accessories.length > 0 ? accessories : undefined}
            actions={
              <ContactActions
                contact={contact}
                isFavorite={isFavorite}
                onToggleFavorite={() => toggleFavorite(contact.id)}
                onRefresh={() => revalidate(true)}
                onUse={() => markUsed(contact.id)}
              />
            }
          />
        );
      })}
    </List>
  );
}

export default withAccessToken(google)(SearchContacts);
