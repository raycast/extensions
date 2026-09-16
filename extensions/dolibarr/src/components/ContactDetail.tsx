import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { createClient } from "../api/client";
import { fetchContact } from "../api/contacts";
import type { ContactDetail as ContactDetailData } from "../api/types";
import { contactUrl } from "../api/urls";
import { contactActionOrder, type ContactActionKind } from "../contactActions";
import { getConfig, getWebBaseUrl } from "../preferences";
import { COPY_PHONE } from "../shortcuts";
import { mailtoUrl, telUrl } from "../telephone";

/**
 * Enter and Cmd+Enter follow the order of the available actions rather than a fixed assignment, so a
 * contact without a landline dials the mobile on Enter instead of leaving a dead key.
 */
const POSITIONAL_SHORTCUTS: (Keyboard.Shortcut | undefined)[] = [
  undefined,
  { macOS: { modifiers: ["cmd"], key: "return" }, Windows: { modifiers: ["ctrl"], key: "return" } },
];

const WRITE_EMAIL: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "e" },
  Windows: { modifiers: ["ctrl", "shift"], key: "e" },
};

const OPEN_RECORD: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "o" },
  Windows: { modifiers: ["ctrl"], key: "o" },
};

function fullName(contact: ContactDetailData): string {
  return [contact.firstname, contact.lastname].filter(Boolean).join(" ");
}

function toMarkdown(contact: ContactDetailData): string {
  const lines: string[] = [`# ${fullName(contact)}`];

  const role = [contact.position, contact.department].filter(Boolean).join(" · ");
  if (role.length > 0) lines.push(role);
  if (contact.companyName !== null) lines.push(`**${contact.companyName}**`);

  if (contact.notePrivate !== null) lines.push(`### Note (private)\n\n${contact.notePrivate}`);
  if (contact.notePublic !== null) lines.push(`### Note (public)\n\n${contact.notePublic}`);

  return lines.join("\n\n");
}

export function ContactDetail({ contactId, fallbackName }: { contactId: number; fallbackName: string }) {
  const web = useMemo(() => getWebBaseUrl(), []);

  const { data, isLoading, error } = usePromise(
    async (id: number) => fetchContact(createClient(getConfig()), id),
    [contactId],
  );

  const markdown = error
    ? `# ${fallbackName}\n\nThe contact could not be loaded.\n\n${error.message}`
    : data
      ? toMarkdown(data)
      : `# ${fallbackName}`;

  const order: ContactActionKind[] = data ? contactActionOrder(data) : ["open"];
  const shortcutFor = (kind: ContactActionKind) => POSITIONAL_SHORTCUTS[order.indexOf(kind)];

  const landline = data ? telUrl(data.phonePro) : null;
  const mobile = data ? telUrl(data.phoneMobile) : null;
  const email = data ? mailtoUrl(data.email) : null;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data ? fullName(data) : fallbackName}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            {data.phonePro === null ? null : <Detail.Metadata.Label title="Landline" text={data.phonePro} />}
            {data.phoneMobile === null ? null : <Detail.Metadata.Label title="Mobile" text={data.phoneMobile} />}
            {data.email === null ? null : <Detail.Metadata.Label title="Email" text={data.email} />}
            {data.socialNetworks === null ? null : (
              <Detail.Metadata.TagList title="Social">
                {Object.entries(data.socialNetworks).map(([network, handle]) => (
                  <Detail.Metadata.TagList.Item key={network} text={`${network}: ${handle}`} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {data.civility === null ? null : <Detail.Metadata.Label title="Civility" text={data.civility} />}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          {landline ? (
            <Action.Open title="Call Landline" icon={Icon.Phone} target={landline} shortcut={shortcutFor("call-pro")} />
          ) : null}
          {mobile ? (
            <Action.Open title="Call Mobile" icon={Icon.Phone} target={mobile} shortcut={shortcutFor("call-mobile")} />
          ) : null}
          {email ? (
            <Action.Open
              title="Write Email"
              icon={Icon.Envelope}
              target={email}
              shortcut={shortcutFor("email") ?? WRITE_EMAIL}
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open in Dolibarr"
            url={contactUrl(web, contactId)}
            shortcut={shortcutFor("open") ?? OPEN_RECORD}
          />
          {data?.email ? (
            <Action.CopyToClipboard title="Copy Email" content={data.email} shortcut={Keyboard.Shortcut.Common.Copy} />
          ) : null}
          {data?.phonePro || data?.phoneMobile ? (
            <Action.CopyToClipboard
              title="Copy Phone Number"
              content={(data.phonePro ?? data.phoneMobile) as string}
              shortcut={COPY_PHONE}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
