import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { TupleErrorEmptyView } from "./lib/empty-state";
import { useTupleJson } from "./lib/hooks";
import { setFavorite, startCall } from "./lib/tuple";
import { Contact } from "./lib/types";

export default function SearchContacts() {
  const { data, isLoading, error, revalidate } = useTupleJson<Contact[]>(["contacts", "list"], {
    failureTitle: "Could Not Load Contacts",
  });

  const contacts = data ?? [];
  // Sections keep this ordering even while Raycast filters during search (a one-shot sort would be
  // reordered by match score on every keystroke). Order mirrors the Tuple app's contacts popover:
  // people in a call float to the very top, then favorites, then everyone else online, then offline.
  const inCall = contacts.filter((c) => c.status === "busy").sort(byName);
  const favorites = contacts.filter((c) => c.favorited && c.status !== "busy").sort(byPresenceThenName);
  const online = contacts.filter((c) => !c.favorited && c.status === "online").sort(byName);
  const offline = contacts.filter((c) => !c.favorited && c.status !== "online" && c.status !== "busy").sort(byName);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search contacts by name or email">
      <List.Section title="In a Call">
        {inCall.map((contact) => (
          <ContactItem key={contact.id} contact={contact} onChange={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Favorites">
        {favorites.map((contact) => (
          <ContactItem key={contact.id} contact={contact} onChange={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Online">
        {online.map((contact) => (
          <ContactItem key={contact.id} contact={contact} onChange={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Offline">
        {offline.map((contact) => (
          <ContactItem key={contact.id} contact={contact} onChange={revalidate} />
        ))}
      </List.Section>
      {error ? (
        <TupleErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.TwoPeople} title="No Contacts" description="You have no Tuple contacts yet." />
      )}
    </List>
  );
}

function ContactItem({ contact, onChange }: { contact: Contact; onChange: () => void }) {
  const accessories: List.Item.Accessory[] = [];
  if (contact.favorited) {
    accessories.push({ icon: "⭐", tooltip: "Favorite" });
  }
  if (contact.recent) {
    accessories.push({ tag: "Recent" });
  }
  const presence = presenceTag(contact);
  accessories.push({ tag: presence });

  return (
    <List.Item
      title={contact.full_name}
      subtitle={contact.email}
      keywords={[contact.short_name, contact.email]}
      icon={{ source: Icon.Person, tintColor: presence.color }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Start Call" icon={Icon.Phone} onAction={() => startCallWithFeedback(contact)} />
          <Action
            title={contact.favorited ? "Remove Favorite" : "Add Favorite"}
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => toggleFavorite(contact, onChange)}
          />
          <Action.CopyToClipboard title="Copy Email" content={contact.email} />
        </ActionPanel>
      }
    />
  );
}

async function startCallWithFeedback(contact: Contact) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Calling ${contact.short_name}…` });
  try {
    await startCall(contact.email);
    toast.style = Toast.Style.Success;
    toast.title = `Calling ${contact.short_name}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Start Call";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function toggleFavorite(contact: Contact, onChange: () => void) {
  try {
    await setFavorite(contact.email, !contact.favorited);
    await showToast({
      style: Toast.Style.Success,
      title: contact.favorited ? "Removed Favorite" : "Added Favorite",
      message: contact.full_name,
    });
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Update Favorite" });
  }
}

/** A contact is "present" when online or busy; the CLI reports `busy` for people in a call or room. */
function isPresent(contact: Contact): boolean {
  return contact.status === "online" || contact.status === "busy";
}

/** Status pill: green when online, orange when in a call, muted when offline. */
function presenceTag(contact: Contact): { value: string; color: Color } {
  switch (contact.status) {
    case "online":
      return { value: "Online", color: Color.Green };
    case "busy":
      return { value: "In a Call", color: Color.Orange };
    default:
      return { value: "Offline", color: Color.SecondaryText };
  }
}

function byName(a: Contact, b: Contact): number {
  return a.full_name.localeCompare(b.full_name);
}

/** Present contacts first, then alphabetical — used to order within the Favorites section. */
function byPresenceThenName(a: Contact, b: Contact): number {
  const aPresent = isPresent(a);
  const bPresent = isPresent(b);
  if (aPresent !== bPresent) {
    return aPresent ? -1 : 1;
  }
  return byName(a, b);
}
