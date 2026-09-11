// fallow-ignore-next-line unresolved-import
import { Icon } from "@raycast/api";
import { getRecipients } from "./api/client";
import { getFigaRecipientUrl, getFigaRecipientsUrl } from "./api/links";
import type { FigaRecipient, FigaRecipientListResponse } from "./api/types";
import { ReferenceListCommand, type ReferenceCommandConfig } from "./reference-list-command";

const RECIPIENT_CONFIG: ReferenceCommandConfig<FigaRecipient, FigaRecipientListResponse> = {
  resource: "recipients",
  title: "Search Recipients",
  itemName: "Recipient",
  pluralName: "Recipients",
  icon: Icon.Person,
  fetch: getRecipients,
  getItems: (response) => response.recipients,
  getListUrl: getFigaRecipientsUrl,
  getItemUrl: (workspaceId, item) => getFigaRecipientUrl(workspaceId, item.id),
};

export default function Command() {
  return <ReferenceListCommand config={RECIPIENT_CONFIG} />;
}
