import { Action, ActionPanel, Form, Keyboard, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { avatarIcon, contactFor, useContacts } from "../lib/contacts";
import { Person, mergePeople, parseAddresses, personLabel } from "../lib/recipients";
import { sparkJSON } from "../lib/spark";
import { actionIcon } from "../lib/sparkIcons";
import { ContactsResult } from "../lib/types";

export interface RecipientField {
  id: string;
  title: string;
  value: string[];
  onChange: (value: string[]) => void;
  /// The field got focus: Add Address adds to the field last focused.
  onFocus?: () => void;
}

const ADD_KEY = process.platform === "win32" ? "Ctrl+N" : "⌘N";

/// Spark's 1000 most-used contacts, most-used first: what the recipient
/// fields offer as you type. Shown from the cache and reloaded each time a
/// form opens.
export function useFrequentContacts(): Person[] {
  const { data = [] } = useCachedPromise(
    async () => (await sparkJSON<ContactsResult>(["contacts", "--limit", "1000"])).contacts,
    [],
    { keepPreviousData: true, onError: () => undefined },
  );
  return data;
}

/// A recipient field as chips. Raycast's tag picker filters its items as you
/// type, so it searches `people` by name or address. Only the chosen chips get
/// an avatar, loaded when they're picked; suggestions have none, so a thousand
/// of them cost nothing to draw.
export function RecipientTags({ field, people }: { field: RecipientField; people: Person[] }) {
  // Chosen addresses come first, so they stay listed (and keep their spelling,
  // which the chips match on) even when they aren't among the frequent ones.
  const known = useMemo(
    () => mergePeople(new Map(), [...field.value.map((email) => ({ email })), ...people]),
    [people, field.value],
  );
  const { contacts } = useContacts(field.value);
  const chosen = new Set(field.value.map((email) => email.toLowerCase()));

  return (
    <Form.TagPicker
      id={field.id}
      title={field.title}
      placeholder={`Type a name, or ${ADD_KEY} to add an address`}
      value={field.value}
      onChange={field.onChange}
      onFocus={field.onFocus}
    >
      {[...known.values()].map((person) => (
        <Form.TagPicker.Item
          key={person.email}
          value={person.email}
          title={personLabel(person)}
          icon={
            chosen.has(person.email.toLowerCase()) ? avatarIcon(person, contactFor(contacts, person.email)) : undefined
          }
        />
      ))}
    </Form.TagPicker>
  );
}

/// Opens a small form for an address the picker doesn't list, and adds it as
/// a chip to one of `fields`, `initial` preselected.
export function AddAddressAction({
  fields,
  initial,
  onAdd,
}: {
  fields: RecipientField[];
  initial?: string;
  onAdd: (fieldId: string, people: Person[]) => void;
}) {
  if (!fields.length) return null;
  return (
    <Action.Push
      title="Add Address"
      icon={actionIcon("PersonCircleAdd")}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddAddressForm fields={fields} initial={initial} onAdd={onAdd} />}
    />
  );
}

function AddAddressForm({
  fields,
  initial,
  onAdd,
}: {
  fields: RecipientField[];
  initial?: string;
  onAdd: (fieldId: string, people: Person[]) => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  function submit(values: { field?: string; address: string }) {
    const { people, invalid } = parseAddresses(values.address);
    if (invalid.length || !people.length) {
      setError(invalid.length ? `Not an email address: ${invalid.join(", ")}` : "Type an email address");
      return;
    }
    onAdd(values.field ?? fields[0].id, people);
    pop();
  }

  return (
    <Form
      navigationTitle="Add Address"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Address" icon={actionIcon("PersonCircleAdd")} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {fields.length > 1 && (
        <Form.Dropdown id="field" title="Add To" defaultValue={initial ?? fields[0].id}>
          {fields.map((field) => (
            <Form.Dropdown.Item key={field.id} value={field.id} title={field.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="address"
        title="Address"
        placeholder="anna@example.com, or Anna Doe <anna@example.com>"
        autoFocus
        error={error}
        onChange={() => error && setError(undefined)}
      />
    </Form>
  );
}
