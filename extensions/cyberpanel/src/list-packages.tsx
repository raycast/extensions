import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { deletePackage, listPackages } from "./utils/api";
import { useEffect, useState } from "react";
import ErrorComponent from "./components/ErrorComponent";
import { ListPackagsResponse, Package } from "./types/packages";
import CreatePackage from "./components/packages/CreatePackageComponent";
import ModifyPackage from "./components/packages/ModifyPackageComponent";

export default function ListPackages() {
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<Package[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listPackages();
    if (response.error_message === "None") {
      const successResponse = response as ListPackagsResponse;
      const packagesData =
        typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${packagesData.length} packages`);
      setPackages(packagesData);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(packageName: string) {
    if (
      await confirmAlert({
        title: `Delete package '${packageName}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deletePackage({ packageName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${packageName} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading} isShowingDetail>
      {packages &&
        packages.map((packageItem) => (
          <List.Item
            key={packageItem.packageName}
            title={packageItem.packageName}
            icon={Icon.Box}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Package Name" text={packageItem.packageName} />
                    <List.Item.Detail.Metadata.Label
                      title="Allowed Domains"
                      text={
                        packageItem.allowedDomains.toString() === "0"
                          ? "Unlimited"
                          : packageItem.allowedDomains.toString()
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Bandwidth"
                      text={packageItem.bandwidth.toString() === "0" ? "Unlimited" : packageItem.bandwidth.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Disk Space"
                      text={packageItem.diskSpace.toString() === "0" ? "Unlimited" : packageItem.diskSpace.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Email Accounts"
                      text={packageItem.emailAccounts.toString()}
                    />
                    <List.Item.Detail.Metadata.Label title="FTP Accounts" text={packageItem.ftpAccounts.toString()} />
                    <List.Item.Detail.Metadata.Label title="Databases" text={packageItem.dataBases.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Modify Package"
                  icon={Icon.Pencil}
                  target={<ModifyPackage package={packageItem} onPackageModified={getFromApi} />}
                />
                <ActionPanel.Section>
                  <Action
                    title="Delete Package"
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDelete(packageItem.packageName)}
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
            title="Create Package"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Package"
                  icon={Icon.Plus}
                  target={<CreatePackage onPackageCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
