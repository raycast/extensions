import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useListEmailAccounts, useListEmailAccountsWithDiskInfo } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";

export default function EmailAccounts() {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { isLoading, data } = useListEmailAccounts();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search email account">
      {data?.map((account) => (
        <List.Item
          key={account.email}
          title={account.email}
          icon={Icon.Envelope}
          subtitle={account.login}
          accessories={[
            { tag: { value: "INCOMING", color: account.suspended_incoming ? Color.Red : Color.Green } },
            { tag: { value: "LOGIN", color: account.suspended_login ? Color.Red : Color.Green } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Disk Information"
                target={<ViewEmailAccountDiskInformation emailAccount={account.email} />}
                icon={Icon.Coin}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewEmailAccountDiskInformation({ emailAccount }: { emailAccount: string }) {
  const email = emailAccount.split("@")[0];
  const domain = emailAccount.split("@")[1];

  const { isLoading, data } = useListEmailAccountsWithDiskInfo(email, domain);
  const account = data && data[0];

  const markdown = !account
    ? undefined
    : `User: ${account.user} \n\n Domain: ${account.domain} \n\n Email: ${account.email} \n\n---\n\n Disk Used: ${account.humandiskused} of ${account.humandiskquota} (${account.diskusedpercent20}%)`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !account ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Disk Quota (bytes)"
              text={account._diskquota || ""}
              icon={!account._diskquota ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label title="Disk Used (bytes)" text={account._diskused.toString()} />
            <Detail.Metadata.Label title="Disk Used (float)" text={`${account.diskusedpercent_float}`} />
            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Disk Quota (MB)" text={account.diskquota} />
            <Detail.Metadata.Label title="Disk Used (MB)" text={account.diskused.toString()} />
            <Detail.Metadata.Label title="Disk Used (percent)" text={`${account.diskusedpercent}%`} />

            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Modified" text={new Date(account.mtime * 1000).toString()} />
            <Detail.Metadata.Label title="Hold Outgoing" icon={account.hold_outgoing ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.TagList title="Restrictions">
              <Detail.Metadata.TagList.Item text="Login" color={!account.suspended_login ? Color.Green : Color.Red} />
              <Detail.Metadata.TagList.Item
                text="Outgoing"
                color={!account.suspended_outgoing ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
    />
  );
}
