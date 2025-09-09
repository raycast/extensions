import { ActionPanel, Form, Action, LocalStorage, showToast, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { TEMP_MAIL_DOMAINS } from "temp-mail-plus-api";
import { setTimeout } from "timers/promises";

export default function Command() {
  const [mailUsername, setMailUsername] = useState<string>();
  const [mailDomain, setMailDomain] = useState<string>();

  const getCurrentMailAddress = async () => {
    const mailAddress = await LocalStorage.getItem<string>("mail_address");
    if (mailAddress) {
      const [user, domain] = mailAddress.split("@");
      setMailDomain(domain);
      setMailUsername(user);
    }
  };

  const setMailAddress = async ({ mail_username, mail_domain }: { mail_username: string; mail_domain: string }) => {
    const mailAddress = `${mail_username}@${mail_domain}`;
    await LocalStorage.setItem("mail_address", mailAddress);
    setMailDomain(mail_domain);
    setMailUsername(mail_username);

    await showToast({
      title: "Mail address set",
      message: `Your new mail address is ${mail_username}@${mail_domain}`,
    });

    await setTimeout(1_000);
    popToRoot();
  };

  useEffect(() => {
    getCurrentMailAddress();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Get New Mail Address"
            onSubmit={(values) => {
              setMailAddress({
                mail_username: values.mail_username as string,
                mail_domain: values.mail_domain as string,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mail_domain" title="Domain" onChange={setMailDomain}>
        {TEMP_MAIL_DOMAINS.map((domain) => (
          <Form.Dropdown.Item value={domain} title={`@${domain}`} key={domain} icon={"💌"} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="mail_username" title="Mail name" value={mailUsername} onChange={setMailUsername} />
    </Form>
  );
}
