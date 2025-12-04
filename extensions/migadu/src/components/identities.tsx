import { useState } from "react";
import { Identity, IdentityCreate, IdentityEdit, Mailbox } from "../utils/types";
import { createMailboxIdentity, deleteMailboxIdentity, editMailboxIdentity, getMailboxIdentities } from "../utils/api";
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
import { useCachedState, useForm } from "@raycast/utils";
import { uniqueNamesGenerator } from "unique-names-generator";
import { UNIQUE_NAME_GENERATOR_CONFIG } from "../utils/constants";

export function IdentitiesIndex({ mailbox }: { mailbox: Mailbox }) {
  const { push } = useNavigation();
  const [identities, setIdentities] = useCachedState<Identity[]>("identities", mailbox.identities, {
    cacheNamespace: `${mailbox.domain_name}-${mailbox.local_part}`,
  });
  const [isLoading, setIsLoading] = useState(false);

  const domain = mailbox.domain_name;
  const mailboxLocalPart = mailbox.local_part;

  async function getMailboxIdentitiesFromApi() {
    setIsLoading(true);
    const response = await getMailboxIdentities(domain, mailboxLocalPart);
    if (!("error" in response)) setIdentities(response.identities);
    setIsLoading(false);
  }

  async function confirmAndDelete(identity: Identity) {
    if (
      await confirmAlert({
        title: `Delete '${identity.address}'?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteMailboxIdentity(domain, mailboxLocalPart, identity.local_part);
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Deleted Identity", `${response.address}`);
        await getMailboxIdentitiesFromApi();
      }
      setIsLoading(false);
    }
  }

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search identity...">
      <List.Section title={`${identities.length} ${identities.length === 1 ? "identity" : "identities"}`}>
        {identities.map((identity) => (
          <List.Item
            key={identity.address}
            title={`${identity.name} (${identity.address})`}
            icon={Icon.Fingerprint}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Identity"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <IdentitiesEdit
                        mailbox={mailbox}
                        identity={identity}
                        onIdentityEdited={getMailboxIdentitiesFromApi}
                      />,
                    )
                  }
                />
                <Action
                  title="Delete Identity"
                  icon={Icon.DeleteDocument}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(identity)}
                />
                <Action
                  title="Create New Identity"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(<IdentitiesCreate mailbox={mailbox} onIdentityCreated={getMailboxIdentitiesFromApi} />)
                  }
                />
                <Action
                  title="Reload Mailboxes"
                  icon={Icon.Redo}
                  shortcut={{ modifiers: ["opt"], key: "r" }}
                  onAction={getMailboxIdentitiesFromApi}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`
### Footer - ${identity.footer_active ? "✅" : "❌"}
---
**Plain Body:**

${identity.footer_plain_body}

**HTML Body:**

${identity.footer_html_body}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(identity).map(([key, val]) => {
                      if (val === false)
                        return <List.Item.Detail.Metadata.Label key={key} title={key} icon={Icon.Multiply} />;
                      else if (val === true)
                        return <List.Item.Detail.Metadata.Label key={key} title={key} icon={Icon.Check} />;
                      else if (!val || !val.length)
                        return <List.Item.Detail.Metadata.Label key={key} title={key} icon={Icon.Minus} />;
                      else return <List.Item.Detail.Metadata.Label key={key} title={key} text={val.toString()} />;
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
            title="Create New Identity"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create New Identity"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(<IdentitiesCreate mailbox={mailbox} onIdentityCreated={getMailboxIdentitiesFromApi} />)
                  }
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Identities"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action
                  title="Reload Identities"
                  icon={Icon.Redo}
                  shortcut={{ modifiers: ["opt"], key: "r" }}
                  onAction={getMailboxIdentitiesFromApi}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type IdentitiesCreateProps = {
  mailbox: Mailbox;
  onIdentityCreated: () => void;
};
function IdentitiesCreate({ mailbox, onIdentityCreated }: IdentitiesCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [identityType, setIdentityType] = useState("identity_password_use_none");

  const domain = mailbox.domain_name;
  const mailboxLocalPart = mailbox.local_part;

  const { handleSubmit, itemProps, setValue } = useForm<IdentityCreate>({
    async onSubmit(values) {
      setIsLoading(true);

      const newIdentity: IdentityCreate = { ...values };
      if ("identityType" in newIdentity) delete newIdentity.identityType;

      const response = await createMailboxIdentity(domain, mailboxLocalPart, newIdentity);
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Created Identity", `${response.address}`);
        onIdentityCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name(value) {
        if (!value) return "The item is required";
        else if (mailbox.name == value || mailbox.identities.some((identity) => identity.name == value))
          return "The item must not be same as existing Identity or Mailbox";
      },
      local_part(value) {
        if (!value) return "The item is required";
        else if (mailbox.local_part == value || mailbox.identities.some((identity) => identity.local_part == value))
          return "The item must not be same as existing Identity or Mailbox";
      },
      password(value) {
        if (identityType === "identity_password_use_custom") {
          if (!value) return "The item is required";
          else if (value.length < 6) return "Password must be at least 6 characters";
        }
      },
      footer_plain_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
      footer_html_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
    },
    initialValues: {
      footer_active: mailbox.footer_active,
      footer_plain_body: mailbox.footer_plain_body,
      footer_html_body: mailbox.footer_html_body,
    },
  });

  const generateLocalPart = () => {
    setValue("local_part", uniqueNamesGenerator(UNIQUE_NAME_GENERATOR_CONFIG));
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create New Identity"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action
            title="Generate Random Address"
            icon={Icon.RotateClockwise}
            shortcut={{
              modifiers: ["ctrl"],
              key: "r",
            }}
            onAction={generateLocalPart}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.Description title="Mailbox" text={`${mailbox.name}<${mailbox.address}>`} />

      <Form.Separator />
      <Form.Description text="Identity Information" />
      <Form.TextField
        title="Name"
        placeholder="Identity"
        info="The name shown in Migadu Admin Panel"
        {...itemProps.name}
      />
      <Form.TextField title="Address" placeholder="identity" {...itemProps.local_part} />
      <Form.Description text={`${itemProps.local_part.value || "[ADDRESS]"}@${domain}`} />

      <Form.Dropdown id="identityType" title="Identity Password" onChange={setIdentityType}>
        <Form.Dropdown.Item
          title="Not used for authentication, sender persona only"
          value="identity_password_use_none"
        />
        <Form.Dropdown.Item title="Use custom password" value="identity_password_use_custom" />
      </Form.Dropdown>
      <Form.Description
        text={
          identityType === "identity_password_use_none"
            ? `Used if you just need to be able to send using a specific "From" identity, but still authenticate with the mailbox address and password. Receiving is also configured out of the box by an implicit alias, so you can receive replies.`
            : `Used if you need an application specific password (e.g. your phone), shared mailbox with individual passwords or sandboxing of accounts for specific services. Sending identities are implied and receiving is automatically configured, so you don't need extra aliases.`
        }
      />
      {identityType === "identity_password_use_custom" && (
        <Form.PasswordField
          title="Password"
          placeholder="hunter2"
          info="Set password immediately for user"
          {...itemProps.password}
        />
      )}

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
    </Form>
  );
}

type IdentitiesEditProps = {
  mailbox: Mailbox;
  identity: Identity;
  onIdentityEdited: () => void;
};
function IdentitiesEdit({ mailbox, identity, onIdentityEdited }: IdentitiesEditProps) {
  const { pop } = useNavigation();

  const propIdentity = identity;

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<IdentityEdit>({
    async onSubmit(values) {
      setIsLoading(true);

      const modifiedIdentity: IdentityEdit = { ...values };

      const response = await editMailboxIdentity(
        identity.domain_name,
        mailbox.local_part,
        identity.local_part,
        modifiedIdentity,
      );
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Edited Identity", `${response.name}<${response.address}>`);
        onIdentityEdited();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name(value) {
        if (value)
          if (
            mailbox.name == value ||
            mailbox.identities.some((identity) => identity.name !== propIdentity.name && identity.name == value)
          )
            return "The item must not be same as existing Identity or Mailbox";
      },
      password(value) {
        if (value && value.length < 6) return "Password must be at least 6 characters";
      },
      footer_plain_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
      footer_html_body(value) {
        if (itemProps.footer_active.value && !value) return "The item is required";
      },
    },
    initialValues: {
      name: identity.name,
      may_send: identity.may_send,
      may_receive: identity.may_receive,
      may_access_imap: identity.may_access_imap,
      may_access_pop3: identity.may_access_pop3,
      may_access_managesieve: identity.may_access_managesieve,
      footer_active: identity.footer_active,
      footer_plain_body: identity.footer_plain_body,
      footer_html_body: identity.footer_html_body,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Identity"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={mailbox.domain_name} />
      <Form.Description title="Mailbox" text={`${mailbox.name}<${mailbox.address}>`} />
      <Form.Description title="Identity Adderss" text={identity.address} />

      <Form.Separator />
      <Form.Description text="Identity Information" />
      <Form.TextField
        title="Name"
        placeholder="Example"
        info="The name shown in Migadu Admin Panel"
        {...itemProps.name}
      />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.password} />

      <Form.Separator />
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
