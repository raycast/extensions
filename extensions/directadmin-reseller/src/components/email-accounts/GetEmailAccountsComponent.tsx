import { useEffect, useState } from "react";
import { deleteEmailAccount, getEmailAccounts } from "../../utils/api";
import { GetEmailAccountsResponse, SuccessResponse } from "../../types";
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import CreateEmailAccountComponent from "./CreateEmailAccountComponent";
import ChangeEmailAccountPasswordComponent from "./ChangeEmailAccountPasswordComponent";

type GetEmailAccountsComponentProps = {
  domain: string;
  userToImpersonate?: string;
};
export default function GetEmailAccountsComponent({ domain, userToImpersonate = "" }: GetEmailAccountsComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [emailAccounts, setEmailAccounts] = useState<string[]>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getEmailAccounts({ domain, action: "list" }, userToImpersonate);
    if (response.error === "0") {
      const data = response as GetEmailAccountsResponse;
      const list = data?.list || [];
      setEmailAccounts(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Email Accounts`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDeleteEmailAccount(email: string) {
    if (
      await confirmAlert({
        title: `Delete email account '${email}@${domain}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteEmailAccount({ action: "delete", domain, user: email }, userToImpersonate);
      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        await getFromApi();
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Email Accounts">
      {emailAccounts &&
        (emailAccounts.length === 0 ? (
          <List.EmptyView
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Email Account"
                  icon={Icon.Plus}
                  target={
                    <CreateEmailAccountComponent
                      domain={domain}
                      onEmailAccountCreated={getFromApi}
                      userToImpersonate={userToImpersonate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ) : (
          emailAccounts.map((email) => (
            <List.Item
              key={email}
              title={email}
              subtitle={`@${domain}`}
              icon={Icon.AtSymbol}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Change Password"
                    icon={Icon.Key}
                    target={
                      <ChangeEmailAccountPasswordComponent
                        email={`${email}@${domain}`}
                        onEmailAccountPasswordChanged={getFromApi}
                        userToImpersonate={userToImpersonate}
                      />
                    }
                  />
                  <Action
                    title="Delete Email Account"
                    style={Action.Style.Destructive}
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDeleteEmailAccount(email)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create Email Account"
                      icon={Icon.Plus}
                      target={
                        <CreateEmailAccountComponent
                          domain={domain}
                          onEmailAccountCreated={getFromApi}
                          userToImpersonate={userToImpersonate}
                        />
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
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
                  target={<CreateEmailAccountComponent domain={domain} onEmailAccountCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
