import { Mailbox } from "../types";
import { Action, ActionPanel } from "@raycast/api";
import { getMailboxIcon, MAILBOXES, setMailboxTypeOverride } from "../utils/mailbox";
import { titleCase } from "../utils";
import { MailIcon } from "../utils/presets";

export const MailboxTypeAction = ({ mailbox }: { mailbox: Mailbox }) => (
  <ActionPanel.Submenu title={"Set Mailbox Type"} icon={MailIcon.Envelope}>
    {MAILBOXES.map((type) => (
      <Action
        title={`Set as ${titleCase(type)}`}
        key={type}
        icon={getMailboxIcon(type)}
        onAction={() => setMailboxTypeOverride(mailbox.name, type)}
      />
    ))}
  </ActionPanel.Submenu>
);
