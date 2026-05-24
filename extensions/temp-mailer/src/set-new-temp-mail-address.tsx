import { ActionPanel, Form, Action, LocalStorage, showToast, popToRoot, Toast, Clipboard } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { TEMP_MAIL_DOMAINS } from "temp-mail-plus-api";

interface CreateMailFormValues {
  mail_username: string;
  mail_domain: string;
}

export default function Command() {
  const setMailAddress = async ({ mail_username, mail_domain }: { mail_username: string; mail_domain: string }) => {
    const mailAddress = `${mail_username}@${mail_domain}`;

    // Set as active mail address
    await LocalStorage.setItem("mail_address", mailAddress);

    // Add to saved addresses list (avoid duplicates)
    const existingAddresses = await LocalStorage.getItem<string>("mail_addresses");
    const addressList: string[] = existingAddresses ? JSON.parse(existingAddresses) : [];
    if (!addressList.includes(mailAddress)) {
      addressList.push(mailAddress);
      await LocalStorage.setItem("mail_addresses", JSON.stringify(addressList));
    }

    // Copy to clipboard for convenience
    await Clipboard.copy(mailAddress);
  };

  const { handleSubmit, itemProps } = useForm<CreateMailFormValues>({
    async onSubmit(values) {
      const trimmedUsername = values.mail_username?.trim() ?? "";
      if (!trimmedUsername) {
        await showToast({ style: Toast.Style.Failure, title: "Mail address is required" });
        return;
      }

      try {
        await setMailAddress({
          mail_username: trimmedUsername,
          mail_domain: values.mail_domain as string,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `${trimmedUsername}@${values.mail_domain} your mail address has been set`,
        });

        popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to set mail address",
          message: error instanceof Error ? error.message : undefined,
        });
      }
    },
    validation: {
      mail_username: (value) => {
        if (!value || value?.length < 1) return "Mail address is required";
      },
      mail_domain: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get New Mail Address" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" storeValue={true} {...itemProps.mail_domain}>
        {TEMP_MAIL_DOMAINS.map((domain) => (
          <Form.Dropdown.Item value={domain} title={`@${domain}`} key={domain} icon={"💌"} />
        ))}
      </Form.Dropdown>

      <Form.TextField storeValue={true} autoFocus={false} title="Mail name" {...itemProps.mail_username} />
    </Form>
  );
}
