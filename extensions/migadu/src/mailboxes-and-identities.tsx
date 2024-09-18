import { createMailbox, getMailboxes, editMailbox, deleteMailbox } from "./utils/api";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { FormMailboxCreate, FormMailboxEdit, Mailbox, MailboxCreate, MailboxEdit } from "./utils/types";
import { useEffect, useState } from "react";
import { MAILBOX_SPAM_ACTIONS, MAILBOX_SPAM_AGGRESSIVENESS } from "./utils/constants";
import { IdentitiesIndex } from "./components/identities";
import DomainSelector from "./components/DomainSelector";

export default function Mailboxes() {
  const { push } = useNavigation();
  const handleDomainSelected = (domain: string) => push(<MailboxesIndex domain={domain} />);
  return <DomainSelector onDomainSelected={handleDomainSelected} />;
}

type MailboxesIndexProps = {
  domain: string;
};
function MailboxesIndex({ domain }: MailboxesIndexProps) {
  const { push } = useNavigation();
  const [mailboxes, setMailboxes] = useCachedState<Mailbox[]>("mailboxes", [], {
    cacheNamespace: domain,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function getMailboxesFromApi() {
    setIsLoading(true);
    const response = await getMailboxes(domain);
    if (!("error" in response)) setMailboxes(response.mailboxes);
    setIsLoading(false);
  }
  useEffect(() => {
    getMailboxesFromApi();
  }, []);

  async function confirmAndDelete(mailbox: Mailbox) {
    if (
      await confirmAlert({
        title: `Delete '${mailbox.address}'?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteMailbox(domain, mailbox.local_part);
      if (!("error" in response)) {
        showToast(Toast.Style.Success, "Deleted Mailbox", `${response.address}`);
        await getMailboxesFromApi();
      }
      setIsLoading(false);
    }
  }

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search mailbox...">
      <List.Section title={`${mailboxes.length} ${mailboxes.length === 1 ? "mailbox" : "mailboxes"}`}>
        {mailboxes.map((mailbox) => (
          <List.Item
            key={mailbox.address}
            title={mailbox.address}
            icon={Icon.Envelope}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Mailbox"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<MailboxesEdit domain={domain} mailbox={mailbox} onMailboxEdited={getMailboxesFromApi} />)
                  }
                />
                <Action
                  title="View Identities"
                  icon={Icon.Fingerprint}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  onAction={() => push(<IdentitiesIndex mailbox={mailbox} />)}
                />
                <Action
                  title="Delete Mailbox"
                  icon={Icon.DeleteDocument}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(mailbox)}
                />
                <Action
                  title="Create New Mailbox"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<MailboxesCreate domain={domain} onMailboxCreated={getMailboxesFromApi} />)}
                />
                <Action
                  title="Reload Mailboxes"
                  icon={Icon.Redo}
                  shortcut={{ modifiers: ["opt"], key: "r" }}
                  onAction={getMailboxesFromApi}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`
### Autorespond
---
**SUBJECT:** ${mailbox.autorespond_subject}

**BODY:**

${mailbox.autorespond_body}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(mailbox).map(([key, val]) => {
                      const title = key
                        .split("_")
                        .map((txt) => txt.charAt(0).toUpperCase() + txt.substring(1))
                        .join(" ");
                      let icon: string | undefined = undefined;
                      let text: string | undefined = undefined;
                      if (val === false) icon = Icon.Multiply;
                      else if (val === true) icon = Icon.Check;
                      else if (typeof val === "number") text = val.toString();
                      else if (key === "identities" || key === "forwardings") text = `${val.length} ${key}`;
                      else if (!val || !val.length) icon = Icon.Minus;
                      else text = val.toString();

                      return <List.Item.Detail.Metadata.Label key={key} title={title} icon={icon} text={text} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Mailbox"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create New Mailbox"
                  icon={Icon.Plus}
                  onAction={() => push(<MailboxesCreate domain={domain} onMailboxCreated={getMailboxesFromApi} />)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Mailboxes"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload Mailboxes" icon={Icon.Redo} onAction={getMailboxesFromApi} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type MailboxesCreateProps = {
  domain: string;
  onMailboxCreated: () => void;
};
function MailboxesCreate({ domain, onMailboxCreated }: MailboxesCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const { handleSubmit, itemProps } = useForm<FormMailboxCreate>({
    async onSubmit(values) {
      setIsLoading(true);

      let newExpiresOn = null;
      const newExpireDate = values.autorespond_expires_on;
      if (newExpireDate) {
        const newYear = newExpireDate.getUTCFullYear();
        const newMonth = String(newExpireDate.getUTCMonth()).padStart(2, "0");
        const newDate = String(newExpireDate.getUTCDate()).padStart(2, "0");
        newExpiresOn = `${newYear}-${newMonth}-${newDate}`;
      }
      const newMailbox: MailboxCreate = { ...values, autorespond_expires_on: newExpiresOn };
      newMailbox.sender_denylist = newMailbox.sender_denylist && newMailbox.sender_denylist.replaceAll(" ", "");
      newMailbox.sender_allowlist = newMailbox.sender_allowlist && newMailbox.sender_allowlist.replaceAll(" ", "");
      newMailbox.recipient_denylist =
        newMailbox.recipient_denylist && newMailbox.recipient_denylist.replaceAll(" ", "");

      const response = await createMailbox(domain, newMailbox);
      if (!("error" in response)) {
        showToast(Toast.Style.Success, "Created Mailbox", `${response.local_part}@${domain}`);
        onMailboxCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
      local_part: FormValidation.Required,
      password_method: FormValidation.Required,
      password(value) {
        if (itemProps.password_method.value === "password") {
          if (!value) return "The item is required";
          else if (value.length < 6) return "Password must be at least 6 characters";
        }
      },
      password_recovery_email(value) {
        if (itemProps.password_method.value === "invitation" && !value) return "The item is required";
      },
      autorespond_subject(value) {
        if (itemProps.autorespond_active.value && !value) return "The item is required";
      },
      autorespond_body(value) {
        if (itemProps.autorespond_active.value && !value) return "The item is required";
      },
      autorespond_expires_on(value) {
        if (itemProps.autorespond_active.value && !value) return "The item is required";
      },
      footer_plain_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
      footer_html_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
    },
    initialValues: {
      local_part: "",
      password_method: "password",
      may_send: true,
      may_receive: true,
      may_access_imap: true,
      may_access_pop3: true,
      may_access_managesieve: true,
      spam_action: MAILBOX_SPAM_ACTIONS.find((action) => action.selected)?.value,
      spam_aggressiveness: MAILBOX_SPAM_AGGRESSIVENESS.find((aggressiveness) => aggressiveness.selected)?.value,
      autorespond_subject: "Autoreply: {{subject}}",
      autorespond_body: `Hi there,

Thank you for your message. I will be out of the office from [mm/dd] to [mm/dd] and will have limited access to email. If this is urgent, please contact [NAME] at [EMAIL] or [PHONE]. I will do my best to respond promptly to your email when I return on [mm/dd].

Best,

[MY NAME]`,
      autorespond_expires_on: new Date(),
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create New Mailbox"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />

      <Form.Separator />
      <Form.Description text="Mailbox Information" />
      <Form.TextField
        title="Name"
        placeholder="Example"
        info="The name shown in Migadu Admin Panel"
        {...itemProps.name}
      />
      <Form.TextField title="Address" placeholder="example" {...itemProps.local_part} />
      <Form.Description text={`${itemProps.local_part.value || "[ADDRESS]"}@${domain}`} />

      <Form.Dropdown title="Password Method" {...itemProps.password_method}>
        <Form.Dropdown.Item title="Password (set initial password)" value="password" />
        <Form.Dropdown.Item title="Invitation (invite user to set own password)" value="invitation" />
      </Form.Dropdown>
      {itemProps.password_method.value === "password" && (
        <Form.PasswordField
          title="Password"
          placeholder="hunter2"
          info="Set password immediately for user"
          {...itemProps.password}
        />
      )}
      {itemProps.password_method.value === "invitation" && (
        <Form.TextField
          title="Password Recovery Email"
          placeholder="recovery@example.com"
          info="Invite the future user to set own password"
          {...itemProps.password_recovery_email}
        />
      )}

      <Form.Checkbox id="showAllOptions" label="Show All Options" onChange={(newVal) => setShowAllOptions(newVal)} />

      {showAllOptions && (
        <>
          <Form.Separator />
          <Form.Checkbox
            label="Internal access only"
            info={`A mailbox can be restricted to receive messages only via Migadu outgoing servers. No external message would be accepted.`}
            {...itemProps.is_internal}
          />
          <Form.Description text="Mailbox Services" />
          <Form.Checkbox label="May send" {...itemProps.may_send} />
          <Form.Checkbox label="May receive" {...itemProps.may_receive} />
          <Form.Checkbox label="May access over IMAP" {...itemProps.may_access_imap} />
          <Form.Checkbox label="May access over POP3" {...itemProps.may_access_pop3} />
          <Form.Checkbox
            label="May access ManageSieve"
            info="Sieve is a programming language that can be used for email filtering. When enabled, custom scripts may be managed using the ManageSieve protocol."
            {...itemProps.may_access_managesieve}
          />

          <Form.Separator />
          <Form.Description text="Spam Filter" />
          <Form.Dropdown title="Spam Action" {...itemProps.spam_action}>
            {MAILBOX_SPAM_ACTIONS.map((action) => (
              <Form.Dropdown.Item key={action.value} title={action.title} value={action.value} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="Filter Aggressiveness" {...itemProps.spam_aggressiveness}>
            {MAILBOX_SPAM_AGGRESSIVENESS.map((aggressiveness) => (
              <Form.Dropdown.Item
                key={aggressiveness.value}
                title={aggressiveness.title}
                value={aggressiveness.value}
              />
            ))}
          </Form.Dropdown>

          <Form.TextField
            title="Sender Denylist"
            placeholder="spam@example.com"
            info={`Any message whose header sender (From:) is found in this denylist will be silently dropped.`}
            {...itemProps.sender_denylist}
          />
          <Form.TextField
            title="Sender Allowlist"
            placeholder="bank@example.com"
            info={`Any message whose header sender (From:) is found in this allowlist will be delivered straight to Inbox, ignoring the spam filter recommendation.`}
            {...itemProps.sender_allowlist}
          />
          <Form.TextField
            title="Recipient Denylist"
            placeholder="temp@example.com"
            info={`Any message whose header recipient (To:) is found in this denylist will be silently dropped, without a bounce message. Use with caution.`}
            {...itemProps.recipient_denylist}
          />

          <Form.Separator />
          <Form.Description text="Auto-Response" />
          <Form.Checkbox
            label="Enable Auto-responder"
            info={`If you are going on a vacation or not using the address anymore, you can setup an automatic response here.`}
            {...itemProps.autorespond_active}
          />
          <Form.TextField
            title="Subject"
            info={`Subject variable {{subject}} will be replaced with the actual subject of the received message.`}
            {...itemProps.autorespond_subject}
          />
          <Form.TextArea
            title="Body"
            info=" Make sure to alter the suggested body and its fields with your own."
            {...itemProps.autorespond_body}
          />
          <Form.DatePicker type={Form.DatePicker.Type.Date} title="Ends On" {...itemProps.autorespond_expires_on} />

          <Form.Separator />
          <Form.Description text="Message Footer" />
          <Form.Checkbox label="Enable outgoing messages footer" {...itemProps.footer_active} />
          <Form.Description text="Depending on the message body, either or both of the footer types may be used. Please provide both." />
          <Form.TextArea
            title="Footer Plain Body"
            placeholder={`FIRSTNAME LASTNAME
[signature]`}
            {...itemProps.footer_plain_body}
          />
          <Form.TextArea
            title="Footer HTML Body"
            placeholder={`<p>FIRSTNAME LASTNAME</p>
<p>[signature]</p>`}
            {...itemProps.footer_html_body}
          />
        </>
      )}
    </Form>
  );
}

type MailboxesEditProps = {
  domain: string;
  mailbox: Mailbox;
  onMailboxEdited: () => void;
};
function MailboxesEdit({ domain, mailbox, onMailboxEdited }: MailboxesEditProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<FormMailboxEdit>({
    async onSubmit(values) {
      setIsLoading(true);

      let newExpiresOn = null;
      const newExpireDate = values.autorespond_expires_on;
      if (newExpireDate) {
        const newYear = newExpireDate.getUTCFullYear();
        const newMonth = String(newExpireDate.getUTCMonth()).padStart(2, "0");
        const newDate = String(newExpireDate.getUTCDate()).padStart(2, "0");
        newExpiresOn = `${newYear}-${newMonth}-${newDate}`;
      }
      const newMailbox: MailboxEdit = { ...values, autorespond_expires_on: newExpiresOn };
      newMailbox.sender_denylist = newMailbox.sender_denylist.replaceAll(" ", "");
      newMailbox.sender_allowlist = newMailbox.sender_allowlist.replaceAll(" ", "");
      newMailbox.recipient_denylist = newMailbox.recipient_denylist.replaceAll(" ", "");

      const response = await editMailbox(domain, mailbox.local_part, newMailbox);
      if (!("error" in response)) {
        showToast(Toast.Style.Success, "Edited Mailbox", `${response.local_part}@${domain}`);
        onMailboxEdited();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
      autorespond_subject(value) {
        if (itemProps.autorespond_active.value && !value) return "The item is required";
      },
      autorespond_body(value) {
        if (itemProps.autorespond_active.value && !value) return "The item is required";
      },
      autorespond_expires_on(value) {
        if (itemProps.autorespond_active.value && !value) return "The item is required";
      },
      footer_plain_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
      footer_html_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
    },
    initialValues: {
      name: mailbox.name,
      is_internal: mailbox.is_internal,
      may_send: mailbox.may_send,
      may_receive: mailbox.may_receive,
      may_access_imap: mailbox.may_access_imap,
      may_access_pop3: mailbox.may_access_pop3,
      may_access_managesieve: mailbox.may_access_managesieve,
      spam_action: mailbox.spam_action,
      spam_aggressiveness: mailbox.spam_aggressiveness,
      sender_denylist: mailbox.sender_denylist.join(),
      sender_allowlist: mailbox.sender_allowlist.join(),
      recipient_denylist: mailbox.recipient_denylist.join(),
      autorespond_active: mailbox.autorespond_active,
      autorespond_subject: mailbox.autorespond_subject,
      autorespond_body: mailbox.autorespond_body,
      autorespond_expires_on: mailbox.autorespond_expires_on ? new Date(mailbox.autorespond_expires_on) : new Date(),
      footer_active: mailbox.footer_active,
      footer_plain_body: mailbox.footer_plain_body,
      footer_html_body: mailbox.footer_html_body,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Mailbox"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Mailbox" text={mailbox.address} />

      <Form.Separator />
      <Form.Description text="Mailbox Information" />
      <Form.TextField
        title="Name"
        placeholder="Example"
        info="The name shown in Migadu Admin Panel"
        {...itemProps.name}
      />

      <Form.Separator />
      <Form.Checkbox
        label="Internal access only"
        info={`A mailbox can be restricted to receive messages only via Migadu outgoing servers. No external message would be accepted.`}
        {...itemProps.is_internal}
      />
      <Form.Description text="Mailbox Services" />
      <Form.Checkbox label="May send" {...itemProps.may_send} />
      <Form.Checkbox label="May receive" {...itemProps.may_receive} />
      <Form.Checkbox label="May access over IMAP" {...itemProps.may_access_imap} />
      <Form.Checkbox label="May access over POP3" {...itemProps.may_access_pop3} />
      <Form.Checkbox
        label="May access ManageSieve"
        info="Sieve is a programming language that can be used for email filtering. When enabled, custom scripts may be managed using the ManageSieve protocol."
        {...itemProps.may_access_managesieve}
      />

      <Form.Separator />
      <Form.Description text="Spam Filter" />
      <Form.Dropdown title="Spam Action" {...itemProps.spam_action}>
        {MAILBOX_SPAM_ACTIONS.map((action) => (
          <Form.Dropdown.Item key={action.value} title={action.title} value={action.value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Filter Aggressiveness" {...itemProps.spam_aggressiveness}>
        {MAILBOX_SPAM_AGGRESSIVENESS.map((aggressiveness) => (
          <Form.Dropdown.Item key={aggressiveness.value} title={aggressiveness.title} value={aggressiveness.value} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        title="Sender Denylist"
        placeholder="spam@example.com"
        info={`Any message whose header sender (From:) is found in this denylist will be silently dropped.`}
        {...itemProps.sender_denylist}
      />
      <Form.TextField
        title="Sender Allowlist"
        placeholder="bank@example.com"
        info={`Any message whose header sender (From:) is found in this allowlist will be delivered straight to Inbox, ignoring the spam filter recommendation.`}
        {...itemProps.sender_allowlist}
      />
      <Form.TextField
        title="Recipient Denylist"
        placeholder="temp@example.com"
        info={`Any message whose header recipient (To:) is found in this denylist will be silently dropped, without a bounce message. Use with caution.`}
        {...itemProps.recipient_denylist}
      />

      <Form.Separator />
      <Form.Description text="Auto-Response" />
      <Form.Checkbox
        label="Enable Auto-responder"
        info={`If you are going on a vacation or not using the address anymore, you can setup an automatic response here.`}
        {...itemProps.autorespond_active}
      />
      <Form.TextField
        title="Subject"
        info={`Subject variable {{subject}} will be replaced with the actual subject of the received message.`}
        {...itemProps.autorespond_subject}
      />
      <Form.TextArea
        title="Body"
        info=" Make sure to alter the suggested body and its fields with your own."
        {...itemProps.autorespond_body}
      />
      <Form.DatePicker type={Form.DatePicker.Type.Date} title="Ends On" {...itemProps.autorespond_expires_on} />

      <Form.Separator />
      <Form.Description text="Message Footer" />
      <Form.Checkbox label="Enable outgoing messages footer" {...itemProps.footer_active} />
      <Form.Description text="Depending on the message body, either or both of the footer types may be used. Please provide both." />
      <Form.TextArea
        title="Footer Plain Body"
        placeholder={`FIRSTNAME LASTNAME
[signature]`}
        {...itemProps.footer_plain_body}
      />
      <Form.TextArea
        title="Footer HTML Body"
        placeholder={`<p>FIRSTNAME LASTNAME</p>`}
        {...itemProps.footer_html_body}
      />
    </Form>
  );
}
