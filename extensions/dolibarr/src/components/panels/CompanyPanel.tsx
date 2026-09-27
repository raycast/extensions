import { List } from "@raycast/api";
import type { ThirdpartyDetail } from "../../api/types";

/** Only renders a row when the field is filled — empty labels would pad the panel with noise. */
function optional(title: string, value: string | null) {
  return value === null ? null : <List.Item.Detail.Metadata.Label title={title} text={value} />;
}

function notesMarkdown(detail: ThirdpartyDetail): string {
  const blocks: string[] = [];
  // Private first: 108 of 392 companies have one, only 7 have a public note.
  if (detail.notePrivate !== null) blocks.push(`### Note (private)\n\n${detail.notePrivate}`);
  if (detail.notePublic !== null) blocks.push(`### Note (public)\n\n${detail.notePublic}`);
  return blocks.join("\n\n---\n\n");
}

export function CompanyPanel({ detail, isLoading }: { detail: ThirdpartyDetail | undefined; isLoading: boolean }) {
  if (detail === undefined) {
    return <List.Item.Detail isLoading={isLoading} markdown={isLoading ? "" : "_Details could not be loaded._"} />;
  }

  const location = [detail.zip, detail.town].filter(Boolean).join(" ");

  return (
    <List.Item.Detail
      markdown={notesMarkdown(detail)}
      metadata={
        <List.Item.Detail.Metadata>
          {optional("Address", detail.address)}
          {optional("City", location.length > 0 ? location : null)}
          {optional("Website", detail.url)}
          <List.Item.Detail.Metadata.Separator />
          {optional("VAT ID", detail.vatNumber)}
          {optional("Register court", detail.registerCourt)}
          {optional("Register number", detail.registerNumber)}
          {optional("Legal form", detail.legalForm)}
          <List.Item.Detail.Metadata.Separator />
          {optional("Customer code", detail.customerCode)}
          {optional("Price level", detail.priceLevel === null ? null : String(detail.priceLevel))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
