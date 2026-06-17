import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchProps,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { deleteEmailAccount, listEmailAccountsInDomain } from "./utils/api";
import { useEffect, useState } from "react";
import { EmailAccount, ListEmailAccountsInDomainResponse } from "./types/email-accounts";
import CreateEmailAccount from "./components/email-accounts/CreateEmailAccountComponent";
import ErrorComponent from "./components/ErrorComponent";

export default function ListEmailAccountsInDomain(
  props: LaunchProps<{ arguments: Arguments.ListEmailAccountsInDomain }>,
) {
  const { domain } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listEmailAccountsInDomain({ domain });
    if (response.error_message === "None") {
      const successResponse = response as ListEmailAccountsInDomainResponse;
      const data = typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Email Accounts`);
      setEmailAccounts(data);

      //  Here we do an extra check as the endpoint returns an error instead of empty data object if there are no emails in account
    } else if (response.error_message === "No email accounts exists!") {
      await showToast(Toast.Style.Success, "SUCCESS", "Fetched 0 Email Accounts");
      setEmailAccounts([]);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(email: string) {
    if (
      await confirmAlert({
        title: `Delete Email Account '${email}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteEmailAccount({ email });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${email} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading}>
      {emailAccounts &&
        emailAccounts.map((emailAccount) => (
          <List.Item
            key={emailAccount.id}
            title={emailAccount.id + " - " + emailAccount.email}
            icon={Icon.Envelope}
            accessories={[{ tag: `disk usage: ${emailAccount.DiskUsage}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Delete Email Account"
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDelete(emailAccount.email)}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Email Account"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Email Account"
                  icon={Icon.Plus}
                  target={<CreateEmailAccount initialDomain={domain} onEmailAccountCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
