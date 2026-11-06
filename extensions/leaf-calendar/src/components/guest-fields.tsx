import { Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { leaf, showLeafError } from "../lib/leaf";
import { isEmail } from "../lib/text";
import type { Person } from "../lib/types";

type Props = {
  value: Person[];
  onChange: (guests: Person[]) => void;
  info?: string;
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * A guest picker for forms: type in Add Guest and Leaf Calendar suggests people (from your events, then Google contacts), or
 * offers the address you typed; picked guests collect in Guests, where they can be removed.
 */
export default function GuestFields({ value, onChange, info }: Props) {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useCachedPromise(
    (text: string) => leaf().call("people.search", text ? { query: text } : {}),
    [query.trim()],
    { keepPreviousData: true, onError: showLeafError },
  );

  // Suggestions Not Added Yet, And The Typed Address When Leaf Calendar Doesn't Know It
  const suggestions = (data ?? []).filter((person) => !value.some((guest) => same(guest.email, person.email)));
  const typed = query.trim();
  const offerTyped =
    isEmail(typed) &&
    !suggestions.some((person) => same(person.email, typed)) &&
    !value.some((guest) => same(guest.email, typed));

  function add(email: string) {
    if (!email) {
      return;
    }

    const person = suggestions.find((p) => p.email === email) ?? { name: null, email };
    onChange([...value, person]);
    setQuery("");
  }

  return (
    <>
      <Form.Dropdown
        id="addGuest"
        title="Add Guest"
        value=""
        onChange={add}
        onSearchTextChange={setQuery}
        isLoading={isLoading}
        throttle
        placeholder="Type a name or email"
      >
        <Form.Dropdown.Item value="" title="Type a name or email" icon={Icon.AddPerson} />
        {offerTyped && <Form.Dropdown.Item value={typed} title={`Add ${typed}`} icon={Icon.Envelope} />}
        {suggestions.map((person) => (
          <Form.Dropdown.Item
            key={person.email}
            value={person.email}
            title={person.name ? `${person.name} (${person.email})` : person.email}
            icon={Icon.Person}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="guests"
        title="Guests"
        placeholder="No guests yet"
        info={info}
        value={value.map((guest) => guest.email)}
        onChange={(emails) => onChange(value.filter((guest) => emails.includes(guest.email)))}
      >
        {value.map((guest) => (
          <Form.TagPicker.Item
            key={guest.email}
            value={guest.email}
            title={guest.name ?? guest.email}
            icon={Icon.Person}
          />
        ))}
      </Form.TagPicker>
    </>
  );
}
