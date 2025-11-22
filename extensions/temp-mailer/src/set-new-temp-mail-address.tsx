import { ActionPanel, Form, Action, LocalStorage, showToast, popToRoot, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { TEMP_MAIL_DOMAINS } from "temp-mail-plus-api";
import { setTimeout } from "timers/promises";

interface CreateMailFormValues {
  mail_username: string;
  mail_domain: string;
}

export default function Command() {
  const setMailAddress = async ({ mail_username, mail_domain }: { mail_username: string; mail_domain: string }) => {
    const mailAddress = `${mail_username}@${mail_domain}`;
    await LocalStorage.setItem("mail_address", mailAddress);

    await showToast({
      title: "Mail address set",
      message: `Your new mail address is ${mail_username}@${mail_domain}`,
    });

    await setTimeout(1_000);
    popToRoot();
  };

  const { handleSubmit, itemProps } = useForm<CreateMailFormValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.mail_username}@${values.mail_domain} mail address set`,
      });

      setMailAddress({
        mail_username: values.mail_username as string,
        mail_domain: values.mail_domain as string,
      });
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
