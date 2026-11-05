import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { avatarIcon, contactFor, useContacts } from "../lib/contacts";
import { Person, mergePeople, personLabel } from "../lib/recipients";
import { sparkJSON } from "../lib/spark";
import { ContactsResult } from "../lib/types";

export interface RecipientField {
  id: string;
  title: string;
  value: string[];
  onChange: (value: string[]) => void;
}

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
    <Form.TagPicker id={field.id} title={field.title} value={field.value} onChange={field.onChange}>
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
