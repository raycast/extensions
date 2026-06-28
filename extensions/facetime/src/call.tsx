import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import Style = Toast.Style;
import open from "open";
import { fetchAllContacts } from "swift:../swift/contacts";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";

interface CommandForm {
  contact: string;
  audio: boolean;
}

interface Storage {
  history: string[];
  preferAudio: boolean;
}

export default function Command() {
  const { data: contacts, isLoading } = useCachedPromise(
    async () => {
      const contacts = await fetchAllContacts();
      return contacts as Contact[];
    },
    [],
    {
      failureToastOptions: {
        title: "Could not get contacts",
        message: "Make sure you have granted Raycast access to your contacts.",
        primaryAction: {
          title: "Open System Preferences",
          onAction() {
            open("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts");
          },
        },
      },
    },
  );

  const [searchText, setSearchText] = useState("");

  const storage = usePromise(() =>
    LocalStorage.getItem("call-history").then((value) => JSON.parse(value?.toString() || "{}") as Partial<Storage>),
  );

  const addCallToStorage = async (values: CommandForm) => {
    const contactId = contacts?.find((contact) => {
      const possibleContacts = [...contact.phoneNumbers, ...contact.emailAddresses];

      return possibleContacts.some((contact) => contact.value === values.contact);
    })?.id;

    if (contactId) {
      const history = storage.data?.history || [];
      const newHistory = [contactId, ...history.filter((item) => item !== contactId)].slice(0, 5);
      await LocalStorage.setItem("call-history", JSON.stringify({ history: newHistory, preferAudio: values.audio }));
    }
  };

  async function handleSubmit(values: CommandForm) {
    if (values.contact === "") {
      await showToast({
        style: Style.Failure,
        title: "Input Error",
        message: "You must enter a number before setting up a call",
      });
      return;
    }

    addCallToStorage(values);
    await open(`facetime${values.audio ? "-audio" : ""}:${encodeURIComponent(values.contact)}`);
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }

  if (storage.isLoading || isLoading) {
    return <Form isLoading />;
  }

  const filteredContacts = [...(contacts ?? [])]
    .sort((a, b) => {
      const history = storage.data?.history || [];

      const aCount = count(history, (item) => item === a.id);
      const bCount = count(history, (item) => item === b.id);

      if (aCount > bCount) {
        return -1;
      } else if (aCount < bCount) {
        return 1;
      }

      return getFullName(a) === "" ? 1 : getFullName(b) === "" ? -1 : getFullName(a).localeCompare(getFullName(b));
    })
    .filter((contact) => {
      const possibleContacts = [...contact.phoneNumbers, ...contact.emailAddresses];
      return (
        possibleContacts.some((contact) => contact.value.includes(searchText)) ||
        getFullName(contact).includes(searchText) ||
        contact.nickName?.includes(searchText)
      );
    });

  const resultItems =
    filteredContacts.length > 0 ? (
      filteredContacts.map((contact) => (
        <Form.Dropdown.Section
          key={contact.id}
          title={
            contact.nickName ||
            getFullName(contact) ||
            contact.emailAddresses[0]?.value ||
            contact.phoneNumbers[0]?.value
          }
        >
          <ContactChoices contact={contact} />
        </Form.Dropdown.Section>
      ))
    ) : searchText ? (
      <Form.Dropdown.Section>
        <Form.Dropdown.Item
          value={searchText}
          title={`Call ${searchText}`}
          icon={!/[^\d-+ ]/.test(searchText) ? Icon.Phone : Icon.Envelope}
        />
      </Form.Dropdown.Section>
    ) : undefined;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Setup Call" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="contact" title="Contact" onSearchTextChange={setSearchText}>
        {resultItems}
      </Form.Dropdown>

      <Form.Checkbox id="audio" title="Audio Call" label="Audio" defaultValue={storage.data?.preferAudio || false} />
    </Form>
  );
}

function getFullName(contact: Contact) {
  return `${contact.givenName} ${contact.familyName}`.trim();
}

function count<T>(array: T[], predicate: (item: T) => boolean) {
  return array.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

function ContactChoices({ contact }: { contact: Contact }) {
  const possibleContacts = [...contact.phoneNumbers, ...contact.emailAddresses];

  possibleContacts.sort((a, b) => {
    if (a.value.includes("@icloud.com") && !b.value.includes("@icloud.com")) {
      return -1;
    } else if (!a.value.includes("@icloud.com") && b.value.includes("@icloud.com")) {
      return 1;
    }

    if (a.isMobile && !b.isMobile) {
      return -1;
    } else if (!a.isMobile && b.isMobile) {
      return 1;
    }

    return a.value.localeCompare(b.value);
  });

  return possibleContacts.map((contact) => (
    <Form.Dropdown.Item
      key={contact.value}
      value={contact.value}
      title={contact.value}
      icon={contact.value.includes("@") ? Icon.Envelope : Icon.Phone}
    />
  ));
}
