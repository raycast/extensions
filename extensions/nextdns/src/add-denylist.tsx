import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import isValidDomain from "is-valid-domain";
import { getApiClient, getProfileName } from "./libs/api";
import { NextDNSError } from "./types/nextdns";
import { useEffect, useState } from "react";

type Values = {
  domain: string;
};

export default function Command() {
  const [profileName, setProfileName] = useState<string>("Loading...");

  const preferences = getPreferenceValues<Preferences>();

  const endpoint = `/profiles/${preferences.nextdns_profile_id}/denylist`;
  const api = getApiClient();

  useEffect(() => {
    (async () => {
      setProfileName(await getProfileName());
    })();
  }, []);

  async function handleSubmit(values: Values) {
    const { domain } = values;

    if (!isValidDomain(domain)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid domain",
        message: "Please enter a valid domain",
      });
      return;
    } else {
      const json = await api.post(endpoint, {
        id: domain,
        active: true,
      });

      if (json.data.errors) {
        const errors = json.data.errors as NextDNSError[];

        if (errors[0].code === "duplicate") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Duplicate",
            message: `"${domain}" is already denylisted`,
          });
          return;
        }
      } else {
        showToast(Toast.Style.Success, "Success", `${domain} has been denylisted`);
        launchCommand({
          name: "denylist",
          type: LaunchType.UserInitiated,
        });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Configuring profile "${profileName}" (${preferences.nextdns_profile_id})`} />

      <Form.TextField id="domain" title="Add a domain" placeholder="example.com" />

      <Form.Description text="Denying a domain will automatically deny all its subdomains." />
    </Form>
  );
}
