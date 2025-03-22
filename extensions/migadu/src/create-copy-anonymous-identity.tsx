import { Form, ActionPanel, Action, getPreferenceValues, showHUD, PopToRootType, Clipboard, Icon } from "@raycast/api";
import { createMailboxIdentity, getMailboxes } from "./utils/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { uniqueNamesGenerator } from "unique-names-generator";
import { IdentityCreate, Mailbox } from "./utils/types";
import { useRef } from "react";
import { UNIQUE_NAME_GENERATOR_CONFIG } from "./utils/constants";

type FormValue = Pick<IdentityCreate, "name" | "local_part"> & { mailbox: string };

const PREFERENCES = getPreferenceValues<Preferences>();

// Will open a GitHub bug report titled "[Migadu] ..."
const bugReportUrl = `https://github.com/raycast/extensions/issues/new?body=%3C!--%0APlease%20update%20the%20title%20above%20to%20consisely%20describe%20the%20issue%0A--%3E%0A%0A%23%23%23%20Extension%0A%0Ahttps://www.raycast.com/xmok/migadu%0A%0A%23%23%23%20Description%0A%0A%3C!--%0APlease%20provide%20a%20clear%20and%20concise%20description%20of%20what%20the%20bug%20is.%20Include%0Ascreenshots%20if%20needed.%20Please%20test%20using%20the%20latest%20version%20of%20the%20extension,%20Raycast%20and%20API.%0A--%3E%0A%23%23%23%20Steps%20To%20Reproduce%0A%0A%3C!--%0AYour%20bug%20will%20get%20fixed%20much%20faster%20if%20the%20extension%20author%20can%20easily%20reproduce%20it.%20Issues%20without%20reproduction%20steps%20may%20be%20immediately%20closed%20as%20not%20actionable.%0A--%3E%0A%0A1.%20In%20this%20environment...%0A2.%20With%20this%20config...%0A3.%20Run%20'...'%0A4.%20See%20error...%0A%0A%23%23%23%20Current%20Behaviour%0A%0A%0A%23%23%23%20Expected%20Behaviour%0A%0A%23%23%23%20Raycast%20version%0AVersion:%201.83.2%0A&title=%5BMigadu%5D%20...&template=extension_bug_report.yml&labels=extension,bug&extension-url=https://www.raycast.com/xmok/migadu&description`;

export default function CreateAnonymousIdentityCommand() {
  const mailboxesQuery = useCachedPromise(
    async () => {
      const domains = PREFERENCES.domains.split(",");
      const responses = await Promise.all(domains.map((domain) => getMailboxes(domain.trim(), "error")));
      const mailboxes = responses.flatMap((response) => {
        if ("error" in response) {
          // the API call already shows an error message. If all calls fail, no email can be selected, which is fine.
          return [];
        }
        return response.mailboxes;
      });
      return mailboxes;
    },
    [],
    {
      initialData: [] as Mailbox[],
    },
  );

  const getFullMailbox = (address: string) => mailboxesQuery.data.find((mailbox) => mailbox.address === address);

  const shouldCopyRef = useRef(true);
  const { handleSubmit, setValue, itemProps, values } = useForm<FormValue>({
    initialValues: {
      local_part: uniqueNamesGenerator(UNIQUE_NAME_GENERATOR_CONFIG),
      name: "",
    },
    onSubmit: async ({ mailbox, ...partialIdentity }: FormValue) => {
      const fullNewIdentity: IdentityCreate = {
        ...partialIdentity,
        footer_active: false,
        footer_html_body: "",
        footer_plain_body: "",
      };

      // By definition of the drop down items, this must exist. Just in case it doesn't, show a nice error message.
      const fullMailbox = getFullMailbox(mailbox);
      if (fullMailbox === undefined) {
        showFailureToast(
          "The selected mailbox doesn't seem to exist. This is likely a programming error, please file an issue on GitHub (Opt + Cmd + B).",
        );
        return false;
      }

      const response = await createMailboxIdentity(fullMailbox.domain_name, fullMailbox.local_part, fullNewIdentity);
      if ("error" in response) {
        showFailureToast(`Identity couldn't be created: ${response.error}`);
        return false;
      }

      let message = `Identity "${response.address}" created`;
      if (shouldCopyRef.current) {
        await Clipboard.copy(response.address);
        message += " & copied to clipboard";
      }
      showHUD(message, {
        popToRootType: PopToRootType.Immediate,
      });
    },
    validation: {
      name: FormValidation.Required,
      mailbox: FormValidation.Required,
      local_part: FormValidation.Required,
    },
  });

  const regenerateLocalPart = () => {
    setValue("local_part", uniqueNamesGenerator(UNIQUE_NAME_GENERATOR_CONFIG));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(value: FormValue) => {
              shouldCopyRef.current = true;
              handleSubmit(value);
            }}
            title="Create & Copy Address"
            icon={Icon.Clipboard}
          />
          <Action.SubmitForm
            onSubmit={(value: FormValue) => {
              shouldCopyRef.current = false;
              handleSubmit(value);
            }}
            title="Create Without Copying"
            icon={Icon.PlusSquare}
          />
          <Action
            onAction={regenerateLocalPart}
            title="Generate New Address"
            shortcut={{
              key: "r",
              modifiers: ["ctrl"],
            }}
            icon={Icon.RotateClockwise}
          />
          {/*
           * In the root screen, when this command is focussed, this command is added by Raycast natively.
           * We imitate it within this screen because of the sanity-check error message above.
           */}
          <Action.OpenInBrowser
            title="Report Bug"
            url={bugReportUrl}
            icon={Icon.Bug}
            shortcut={{
              key: "b",
              modifiers: ["opt", "cmd"],
            }}
          />
        </ActionPanel>
      }
      isLoading={mailboxesQuery.isLoading}
    >
      <Form.TextField
        title="Service name"
        autoFocus
        info="Name of the identity. Set to name of service to easily find it among other identities."
        placeholder="Untrusted Corp"
        {...itemProps.name}
      />
      <Form.Separator />
      <Form.TextField
        title="Address"
        info="The local part before the `@`. To create `foo@bar.com`, enter `foo` here."
        placeholder="anonymous"
        {...itemProps.local_part}
      />
      <Form.Description text={`${values.local_part}@${getFullMailbox(values.mailbox)?.domain_name ?? "[DOMAIN]"}`} />
      <Form.Dropdown title="Destination Mailbox" storeValue {...itemProps.mailbox}>
        {mailboxesQuery.data.map((mailbox) => {
          return <Form.Dropdown.Item value={mailbox.address} key={mailbox.address} title={mailbox.address} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
