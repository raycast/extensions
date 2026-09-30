import { useAccounts } from "@hooks/useAccounts";
import { usePackages } from "@hooks/usePackages";
import { Action, ActionPanel, Icon, List, Toast, showToast, Clipboard } from "@raycast/api";
import { buildStr } from "@utils/str-utils";
import { Common } from "@data/common";
import fetch from "node-fetch";
import { useFrontmostApplication } from "@root/hooks/useFrontmostApplication";

type Props = {
  accountName: string;
};

type TPackageList = {
  name: string;
  version: string;
  description: string;
};

type THandlerAction = {
  loadingToast: string;
  successToast: string;
  failureToast: string;
  func: (content: string) => void;
};

export default function PackageList({ accountName }: Props) {
  const { accounts } = useAccounts();
  const token = accounts.find((acc) => acc.name === accountName)?.accessToken;
  const { packages, isLoading } = usePackages(accountName, token ?? "");
  const { frontmostApp } = useFrontmostApplication();

  const onHandleInstallCommand = async (packageFullName: string, token: string, action: THandlerAction) => {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Copying Install Command..." });
      const packageFullNameSplit = packageFullName.split("/");
      const accountName = packageFullNameSplit[0].slice(1);
      const packageName = packageFullNameSplit.slice(1).join("/");
      const data = await fetch(buildStr(Common.URL.PackageLatest, { org: accountName, package: packageName }), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!data.ok) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Copy Install Command";
        return;
      }
      const json = (await data.json()) as TPackageList;
      await action.func(`npm install @${accountName}/${packageName}@${json.version}`);
      toast.style = Toast.Style.Success;
      toast.title = "Install Command Copied";
    } catch (error) {
      console.log(error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to Copy Install Command" });
    }
  };

  const onCopyInstallCommand = async (packageFullName: string, token: string) => {
    onHandleInstallCommand(packageFullName, token, {
      loadingToast: "Copying Install Command...",
      successToast: "Install Command Copied",
      failureToast: "Failed to Copy Install Command",
      func: Clipboard.copy,
    });
  };

  const onPasteInstallCommand = async (packageFullName: string, token: string) => {
    onHandleInstallCommand(packageFullName, token, {
      loadingToast: "Pasting Install Command...",
      successToast: "Install Command Pasted",
      failureToast: "Failed to Paste Install Command",
      func: Clipboard.paste,
    });
  };

  return (
    <List isLoading={isLoading}>
      {packages.map((pkg) => (
        <List.Item
          key={pkg}
          icon={Icon.Terminal}
          title={pkg}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.CopyClipboard}
                title={`Paste Install Command to ${frontmostApp?.name}`}
                onAction={() => onPasteInstallCommand(pkg, token ?? "")}
              />
              <Action
                icon={Icon.CopyClipboard}
                title="Copy Install Command"
                onAction={() => onCopyInstallCommand(pkg, token ?? "")}
              />
              <Action.CopyToClipboard
                icon={Icon.CopyClipboard}
                title="Copy Package Name"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={pkg}
              />
              <Action.OpenInBrowser
                title="Open Homepage"
                url={buildStr(Common.URL.PackageHomepage, { org: accountName, package: pkg.split("/")[1] })}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
