import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { fetchContacts } from "./fetch-contacts";
import { ContactListItem, Preferences } from "./types";
import { formatPhoneNumber, getPhoneIcon, getTagColor } from "./utils";

function ContactActions({
  contact,
  defaultAction,
  actionMode,
}: {
  contact: ContactListItem;
  defaultAction: Preferences["defaultAction"];
  actionMode: Preferences["actionMode"];
}) {
  const phoneNumber = formatPhoneNumber(contact.phone);

  const callAction = async (action: Preferences["defaultAction"]) => {
    let title = "Call";

    if (action === "facetime") {
      title = "FaceTime Video Call";
    } else if (action === "facetime-audio") {
      title = "FaceTime Audio Call";
    }

    const confirmed = await confirmAlert({
      title: `${title} ${contact.name}?`,
      message: contact.phone,
      icon: Icon.Phone,
      primaryAction: {
        title: "Call",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      if (action === "call") {
        await open(`tel:${phoneNumber}`);
      } else if (action === "facetime") {
        await open(`facetime:${phoneNumber}`);
      } else if (action === "facetime-audio") {
        await open(`facetime-audio:${phoneNumber}`);
      }
    }
  };

  const copyAction = async () => {
    await Clipboard.copy(contact.phone);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: contact.phone,
    });
  };

  const actions = {
    call: <Action key="call" title="Call" icon={Icon.Phone} onAction={() => callAction("call")} />,
    message: (
      <Action key="message" title="Send Message" icon={Icon.Message} onAction={() => open(`sms:${phoneNumber}`)} />
    ),
    facetime: (
      <Action key="facetime" title="FaceTime Video" icon={Icon.Video} onAction={() => callAction("facetime")} />
    ),
    "facetime-audio": (
      <Action
        key="facetime-audio"
        title="FaceTime Audio"
        icon={Icon.Microphone}
        onAction={() => callAction("facetime-audio")}
      />
    ),
    copy: (
      <Action
        key="copy"
        title="Copy Number"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={copyAction}
      />
    ),
  };

  const orderedActions = [
    defaultAction,
    ...Object.keys(actions).filter((key) => key !== defaultAction),
  ] as (keyof typeof actions)[];

  if (actionMode === "choose") {
    return (
      <ActionPanel>
        <ActionPanel.Submenu title="Choose Action" icon={Icon.Phone}>
          {orderedActions.map((key) => actions[key])}
        </ActionPanel.Submenu>

        <ActionPanel.Section title="Quick Actions">{orderedActions.map((key) => actions[key])}</ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Communication">{orderedActions.map((key) => actions[key])}</ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const {
    data: contacts,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchContacts, [], {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to load contacts",
      message: "Check that Raycast has permission to access Contacts",
      primaryAction: {
        title: "Open System Settings",
        onAction: () => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts"),
      },
    },
  });

  const contactItems: ContactListItem[] = (contacts ?? []).flatMap((contact) =>
    contact.phones.map((phone, index) => ({
      id: `${contact.id}-${index}`,
      contactId: contact.id,
      name: contact.name,
      phone: phone.number,
      label: phone.label,
    })),
  );

  const { data: sortedItems } = useFrecencySorting(contactItems, {
    key: (item) => item.id,
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to Load Contacts"
          description="Make sure Raycast has permission to access Contacts in System Settings > Privacy & Security > Contacts"
          actions={
            <ActionPanel>
              <Action
                title="Open System Settings"
                icon={Icon.Gear}
                onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts")}
              />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contacts by name or phone number..."
      filtering={{ keepSectionOrder: true }}
    >
      {!isLoading && sortedItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No Contacts Found"
          description="No contacts with phone numbers were found in your address book"
        />
      ) : (
        sortedItems.map((contact) => (
          <List.Item
            key={contact.id}
            icon={getPhoneIcon(contact.label)}
            title={contact.name}
            subtitle={contact.phone}
            keywords={[contact.phone, contact.label]}
            accessories={
              preferences.showPhoneLabels
                ? [{ tag: { value: contact.label, color: getTagColor(contact.label) } }]
                : undefined
            }
            actions={
              <ContactActions
                contact={contact}
                defaultAction={preferences.defaultAction}
                actionMode={preferences.actionMode}
              />
            }
          />
        ))
      )}
    </List>
  );
}
