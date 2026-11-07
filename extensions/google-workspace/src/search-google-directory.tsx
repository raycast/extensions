import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import {
  getAccessToken,
  getAvatarIcon,
  showFailureToast,
  useCachedPromise,
  useCachedState,
  useLocalStorage,
} from "@raycast/utils";
import {
  DirectoryError,
  DirectoryPerson,
  fetchDirectory,
  pinsStorageKey,
  sortPeople,
  usageStorageKey,
} from "./api/directory";
import { getDirectoryAccountId, signOutOfDirectory, withDirectoryAuth } from "./api/directoryAuth";

function DirectoryList({ accountId }: { accountId: string }) {
  const { token } = getAccessToken();
  // useCachedPromise keys its cache on the arguments. The account id is passed (unused by the fetcher) so each
  // Google account gets its own cached directory. The token is closed over instead: it changes on every
  // refresh, which would throw the cached directory away.
  const fetchForAccount: (accountId: string) => Promise<DirectoryPerson[]> = () => fetchDirectory(token);
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(fetchForAccount, [accountId], {
    onError: (error) => {
      // Expected setup problems are explained by the empty view instead of a toast.
      if (!(error instanceof DirectoryError) || error.kind === "other") {
        showFailureToast(error, { title: "Failed to load directory" });
      }
    },
  });
  const {
    value: usage = {},
    setValue: setUsage,
    isLoading: isLoadingUsage,
  } = useLocalStorage<Record<string, number>>(usageStorageKey(accountId), {});
  const {
    value: pins = [],
    setValue: setPins,
    isLoading: isLoadingPins,
  } = useLocalStorage<string[]>(pinsStorageKey(accountId), []);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("directory-show-detail", false);

  const { pinned, others } = sortPeople(data ?? [], usage, pins);
  const errorKind = !data?.length && error instanceof DirectoryError ? error.kind : undefined;

  // While storage is loading the values are defaults; writing then would overwrite what is stored.
  const recordUsage = (id: string) => {
    if (!isLoadingUsage) setUsage({ ...usage, [id]: Date.now() });
  };
  const togglePin = (id: string) => {
    if (!isLoadingPins) setPins(pins.includes(id) ? pins.filter((pin) => pin !== id) : [...pins, id]);
  };

  const signOut = async () => {
    // Overwrite the persisted directory (Raycast Cache, namespaced by a hash of the fetcher) before dropping tokens.
    await mutate(undefined, { optimisticUpdate: () => undefined, shouldRevalidateAfter: false });
    await signOutOfDirectory();
  };

  const recoveryActions = (
    <>
      <Action
        title="Refresh Directory"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action title="Sign out of Google Directory" icon={Icon.Logout} onAction={signOut} />
    </>
  );
  const emptyViewActions = (
    <ActionPanel>
      <ActionPanel.Section>{recoveryActions}</ActionPanel.Section>
    </ActionPanel>
  );

  const renderPerson = (person: DirectoryPerson) => {
    const [primaryEmail, ...otherEmails] = person.emails;
    const isPinned = pins.includes(person.id);
    const role = [person.title, person.department].filter(Boolean).join(" · ");
    const onUse = () => recordUsage(person.id);

    return (
      <List.Item
        key={person.id}
        icon={getAvatarIcon(person.name || primaryEmail)}
        title={person.name || primaryEmail}
        subtitle={person.name ? primaryEmail : undefined}
        keywords={[...person.emails, person.givenName, person.familyName, person.title, person.department].filter(
          (keyword): keyword is string => Boolean(keyword),
        )}
        accessories={
          isShowingDetail
            ? undefined
            : [...(role ? [{ text: role }] : []), ...(person.external ? [{ tag: "External" }] : [])]
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {person.emails.map((email, index) => (
                  <List.Item.Detail.Metadata.Label
                    key={`${email}-${index}`}
                    title={index === 0 ? "Email" : ""}
                    text={email}
                  />
                ))}
                {person.phones.map((phone, index) => (
                  <List.Item.Detail.Metadata.Label
                    key={`${phone.value}-${index}`}
                    title={phone.type ?? "Phone"}
                    text={phone.value}
                  />
                ))}
                {person.title && <List.Item.Detail.Metadata.Label title="Title" text={person.title} />}
                {person.department && <List.Item.Detail.Metadata.Label title="Department" text={person.department} />}
                {person.external && <List.Item.Detail.Metadata.Label title="Type" text="External contact" />}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            {primaryEmail && (
              <ActionPanel.Section>
                <Action.Paste title="Paste Email" content={primaryEmail} icon={Icon.Envelope} onPaste={onUse} />
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={primaryEmail}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onCopy={onUse}
                />
              </ActionPanel.Section>
            )}
            {otherEmails.length > 0 && (
              <ActionPanel.Section title="Other Emails">
                {otherEmails.map((email, index) => (
                  <Action.Paste
                    key={`${email}-${index}`}
                    title={`Paste ${email}`}
                    content={email}
                    icon={Icon.Envelope}
                    onPaste={onUse}
                  />
                ))}
              </ActionPanel.Section>
            )}
            {!!person.name && (
              <ActionPanel.Section title="Name">
                {/* Copy first so it becomes the primary action for people without an email. */}
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={person.name}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                  onCopy={onUse}
                />
                <Action.Paste title="Paste Name" content={person.name} icon={Icon.Person} onPaste={onUse} />
              </ActionPanel.Section>
            )}
            {person.phones.length > 0 && (
              <ActionPanel.Section title="Phones">
                {person.phones.map((phone, index) => (
                  <Action.CopyToClipboard
                    key={`${phone.value}-${index}`}
                    title={`Copy ${phone.value}`}
                    content={phone.value}
                    icon={Icon.Phone}
                    onCopy={onUse}
                  />
                ))}
              </ActionPanel.Section>
            )}
            <ActionPanel.Section>
              <Action
                title={isPinned ? "Unpin" : "Pin"}
                icon={isPinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => togglePin(person.id)}
              />
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              {recoveryActions}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search by name or email">
      {errorKind === "unavailable" ? (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="Directory Unavailable"
          description="Searching the directory requires a Google Workspace account whose admin has enabled directory sharing."
          actions={emptyViewActions}
        />
      ) : errorKind === "insufficient-scope" ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Missing Permissions"
          description="Raycast wasn't allowed to read your directory. Sign out, then reopen the command and grant access."
          actions={emptyViewActions}
        />
      ) : (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title={isLoading ? "Loading directory…" : "No people found"}
          actions={emptyViewActions}
        />
      )}
      {pinned.length > 0 && <List.Section title="Pinned">{pinned.map(renderPerson)}</List.Section>}
      <List.Section title="People">{others.map(renderPerson)}</List.Section>
    </List>
  );
}

function SearchGoogleDirectory() {
  const accountId = getDirectoryAccountId();
  // Without an account id (token issued before the `openid` scope) nothing is fetched or read from any cache;
  // signing out and back in grants the scope.
  if (!accountId) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Missing Permissions"
          description="Raycast wasn't allowed to read your directory. Sign out, then reopen the command and grant access."
          actions={
            <ActionPanel>
              <Action title="Sign out of Google Directory" icon={Icon.Logout} onAction={signOutOfDirectory} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <DirectoryList accountId={accountId} />;
}

export default withDirectoryAuth(SearchGoogleDirectory);
