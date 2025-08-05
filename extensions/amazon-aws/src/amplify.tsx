import { App, Branch } from "@aws-sdk/client-amplify";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { useAmplifyApps, useAmplifyBranches } from "./hooks/use-amplify";
import { resourceToConsoleLink } from "./util";

export default function Amplify() {
  const { apps, error, isLoading, revalidate } = useAmplifyApps();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Amplify apps by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        apps?.map((app) => <AmplifyApp key={app.appId} app={app} />)
      )}
    </List>
  );
}

function AmplifyApp({ app }: { app: App }) {
  const appUrl = `https://${app.defaultDomain}`;

  return (
    <List.Item
      key={app.appId}
      title={app.name || ""}
      subtitle={app.description || ""}
      icon={{ source: "aws-icons/amplify.png", mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <Action.Push target={<AmplifyBranches app={app} />} title="View Branches" icon={Icon.List} />
          <Action.OpenInBrowser title="Open App" url={appUrl} icon={Icon.Globe} />
          <AwsAction.Console url={resourceToConsoleLink(app.appId, "AWS::Amplify::App")} />
          <Action.CopyToClipboard title="Copy App ID" content={app.appId || ""} />
          <Action.CopyToClipboard title="Copy App URL" content={appUrl} />
          {app.repository && <Action.CopyToClipboard title="Copy Repository" content={app.repository} />}
        </ActionPanel>
      }
      accessories={[{ text: app.platform || "" }, ...(app.updateTime ? [{ date: new Date(app.updateTime) }] : [])]}
    />
  );
}

function AmplifyBranches({ app }: { app: App }) {
  const { branches, error, isLoading } = useAmplifyBranches(app.appId!);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app.name} Branches`}
      searchBarPlaceholder="Filter branches by name..."
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        branches?.map((branch) => <AmplifyBranch key={branch.branchArn} branch={branch} app={app} />)
      )}
    </List>
  );
}

function AmplifyBranch({ branch, app }: { branch: Branch; app: App }) {
  const branchUrl = `https://${branch.branchName}.${app.defaultDomain}`;

  return (
    <List.Item
      key={branch.branchArn}
      title={branch.branchName || ""}
      subtitle={branch.displayName || ""}
      icon={{ source: "aws-icons/amplify.png", mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Branch" url={branchUrl} icon={Icon.Globe} />
          <AwsAction.Console
            url={resourceToConsoleLink(`${app.appId}/branches/${branch.branchName}`, "AWS::Amplify::Branch")}
          />
          <Action.CopyToClipboard title="Copy Branch Name" content={branch.branchName || ""} />
          <Action.CopyToClipboard title="Copy Branch URL" content={branchUrl} />
          {branch.activeJobId && <Action.CopyToClipboard title="Copy Active Job ID" content={branch.activeJobId} />}
        </ActionPanel>
      }
      accessories={[
        { text: branch.stage || "" },
        {
          tag: {
            value: branch.enableAutoBuild ? "Auto Build" : "Manual",
            color: branch.enableAutoBuild ? "green" : "orange",
          },
        },
        ...(branch.updateTime ? [{ date: new Date(branch.updateTime) }] : []),
      ]}
    />
  );
}
