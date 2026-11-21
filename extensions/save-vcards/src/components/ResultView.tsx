// What was captured (image or text) beside what was detected. ↵ saves straight away;
// Edit Before Saving opens the full form.
import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useMemo } from "react";
import { copyState, exportState, phoneLabelTitle, saveState, stateFromDraft, type FormState } from "../core/contact";
import { LOG_FILE } from "../core/log";
import type { ContactDraft } from "../core/parse";
import { useContactsInfo } from "../core/useContactsInfo";
import { ContactForm } from "./ContactForm";

const fence = (text: string) => "```\n" + text.replace(/```/g, "ˋˋˋ") + "\n```";

function markdown(text: string, image?: string): string {
  const parts: string[] = [];
  if (image) parts.push(`![Captured image](${encodeURI(`file://${image}`)}?raycast-height=320)`);
  parts.push(image ? "**Recognized text**" : "**Captured text**");
  parts.push(text.trim() ? fence(text.trim()) : "_No text found._");
  return parts.join("\n\n");
}

export function ResultView(props: { text: string; image?: string; draft: ContactDraft }) {
  const { text, image, draft } = props;
  const emails = useMemo(() => draft.emails.map((e) => e.value), [draft]);
  const phones = useMemo(() => draft.phones.map((p) => p.value), [draft]);
  const contacts = useContactsInfo(emails, phones);

  const state = (): FormState => stateFromDraft(draft, contacts.accountId);
  const name = [draft.namePrefix, draft.givenName, draft.familyName].filter(Boolean).join(" ");
  const fullName = [name, draft.nameSuffix].filter(Boolean).join(", ");
  const a = draft.address;
  const address = a ? [a.street, [a.postalCode, a.city].filter(Boolean).join(" "), a.country].filter(Boolean) : [];
  const found = !!(fullName || draft.organization || draft.emails.length || draft.phones.length);
  const account = contacts.accounts.find((x) => x.id === contacts.accountId);

  const edit = (
    <Action.Push
      title="Edit Before Saving"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={<ContactForm initial={state()} text={text} />}
    />
  );

  return (
    <Detail
      isLoading={contacts.checking}
      markdown={markdown(text, image)}
      metadata={
        <Detail.Metadata>
          {!found && <Detail.Metadata.Label title="Detected" text="No contact details. Edit to add them." />}
          {fullName && <Detail.Metadata.Label title="Name" text={fullName} icon={Icon.Person} />}
          {draft.jobTitle && <Detail.Metadata.Label title="Job Title" text={draft.jobTitle} />}
          {draft.organization && (
            <Detail.Metadata.Label title="Company" text={draft.organization} icon={Icon.Building} />
          )}
          {draft.emails.map((e) => (
            <Detail.Metadata.Label key={e.value} title="Email" text={e.value} icon={Icon.Envelope} />
          ))}
          {draft.phones.map((p) => (
            <Detail.Metadata.Label key={p.value} title={phoneLabelTitle(p.label)} text={p.value} icon={Icon.Phone} />
          ))}
          {draft.urls.map((u) => (
            <Detail.Metadata.Label key={u.value} title="Website" text={u.value} icon={Icon.Globe} />
          ))}
          {address.length > 0 && <Detail.Metadata.Label title="Address" text={address.join(", ")} icon={Icon.Pin} />}
          {(account || contacts.existing.length > 0) && <Detail.Metadata.Separator />}
          {account && <Detail.Metadata.Label title="Save To" text={account.name} />}
          {contacts.existing.length > 0 && (
            <Detail.Metadata.TagList title="Already in Contacts">
              {contacts.existing.map((e) => (
                <Detail.Metadata.TagList.Item key={e.id} text={e.name} color={Color.Orange} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {found ? (
              <Action title="Save to Contacts" icon={Icon.AddPerson} onAction={() => saveState(state(), {})} />
            ) : (
              edit
            )}
            {found && edit}
            {found &&
              contacts.existing.map((e, i) => (
                <Action
                  key={e.id}
                  title={`Add to Existing Contact: ${e.name}`}
                  icon={Icon.PersonCircle}
                  shortcut={i === 0 ? { modifiers: ["cmd", "shift"], key: "return" } : undefined}
                  onAction={() => saveState(state(), { updateId: e.id })}
                />
              ))}
            {found && (
              <Action
                title="Save and Open in Contacts"
                icon={Icon.AppWindow}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => saveState(state(), { openAfter: true })}
              />
            )}
            {contacts.accounts.length > 1 && (
              <ActionPanel.Submenu title="Choose Account" icon={Icon.Tray}>
                {contacts.accounts.map((acc) => (
                  <Action
                    key={acc.id}
                    title={acc.isDefault ? `${acc.name} (Default)` : acc.name}
                    icon={acc.id === contacts.accountId ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => contacts.setAccountId(acc.id)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          {found && (
            <ActionPanel.Section>
              <Action
                title="Export Contact File"
                icon={Icon.Download}
                shortcut={Keyboard.Shortcut.Common.Save}
                onAction={() => exportState(state())}
              />
              <Action
                title="Copy Contact Card"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={() => copyState(state())}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {contacts.existing.map((e) => (
              <Action.Open
                key={e.id}
                title={`Open ${e.name} in Contacts`}
                icon={Icon.Person}
                target={`addressbook://${e.id}`}
              />
            ))}
            <Action.Open
              title="Open Debug Log"
              icon={Icon.Bug}
              target={LOG_FILE}
              application="Console"
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
