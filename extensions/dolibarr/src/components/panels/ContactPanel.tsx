import { List } from "@raycast/api";
import type { Contact } from "../../api/types";

function optional(title: string, value: string | null) {
  return value === null ? null : <List.Item.Detail.Metadata.Label title={title} text={value} />;
}

export function ContactPanel({ contact }: { contact: Contact }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {optional("Position", contact.position)}
          <List.Item.Detail.Metadata.Separator />
          {optional("Landline", contact.phonePro)}
          {optional("Mobile", contact.phoneMobile)}
          {optional("Email", contact.email)}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
