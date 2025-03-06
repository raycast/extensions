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
import { deleteFTPAccount, listFTPAccountsInDomain } from "./utils/api";
import { useEffect, useState } from "react";
import ErrorComponent from "./components/ErrorComponent";
import { FTPAccount, ListFTPAccountsInDomainResponse } from "./types/ftp-accounts";
import CreateFTPAccount from "./components/ftp-accounts/CreateFTPAccountComponent";

export default function ListFTPAccountsInDomain(props: LaunchProps<{ arguments: Arguments.ListFtpAccountsInDomain }>) {
  const { selectedDomain } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [ftpAccounts, setFTPAccounts] = useState<FTPAccount[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listFTPAccountsInDomain({ selectedDomain });
    if (response.error_message === "None") {
      const successResponse = response as ListFTPAccountsInDomainResponse;
      const data = typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} FTP Accounts`);
      setFTPAccounts(data);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(ftpUsername: string) {
    if (
      await confirmAlert({
        title: `Delete FTP Account '${ftpUsername}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteFTPAccount({ ftpUsername });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${ftpUsername} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading}>
      <List.Section title={`domain: ${selectedDomain}`}>
        {ftpAccounts &&
          ftpAccounts.map((ftpAccount) => (
            <List.Item
              key={ftpAccount.user}
              title={ftpAccount.id + " - " + ftpAccount.user}
              icon={Icon.PersonCircle}
              subtitle={`dir: ${ftpAccount.dir}`}
              accessories={[{ tag: `quota: ${ftpAccount.quotasize}` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Delete FTP Account"
                      icon={Icon.RemovePerson}
                      onAction={() => confirmAndDelete(ftpAccount.user)}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create FTP Account"
            icon={Icon.AddPerson}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create FTP Account"
                  icon={Icon.AddPerson}
                  target={<CreateFTPAccount initialFTPDomain={selectedDomain} onFTPAccountCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
