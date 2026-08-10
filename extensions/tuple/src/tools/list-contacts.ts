import { listContacts } from "../lib/tuple";

type Input = {
  /** Only include contacts whose name or email contains this text. */
  query?: string;
};

/** List Tuple contacts with their online status, favorite, and recent flags. */
export default async function (input: Input) {
  const contacts = await listContacts();
  const needle = input.query?.toLowerCase();

  return contacts
    .filter(
      (contact) =>
        !needle || contact.full_name.toLowerCase().includes(needle) || contact.email.toLowerCase().includes(needle),
    )
    .map((contact) => ({
      name: contact.full_name,
      email: contact.email,
      status: contact.status,
      favorited: contact.favorited,
      recent: contact.recent,
      kind: contact.kind,
    }));
}
