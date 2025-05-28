import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import useVultr from "./lib/hooks/use-vultr";
import { Account, AccountBandwidth } from "./lib/types/account";
import { timestampToString } from "./lib/utils";
import { ACLs, VULTR_LINKS } from "./lib/constants";
import OpenInVultr from "./lib/components/open-in-vultr";

export default function AccountInfo() {
  const { isLoading, data } = useVultr<{ account: Account }>("account");
  const markdown = !data
    ? ""
    : `
    
| Balance | Pending Charges |
|---------|-----------------|
| ${data.account.balance} | ${data.account.pending_charges} |

| Name | Email |
|------|-------|
| ${data.account.name} | ${data.account.email} |

| Last Payment Date | Last Payment Amount |
|-------------------|---------------------|
| ${data.account.last_payment_date} | ${data.account.last_payment_amount} |`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={"Account Info" + markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="ACLs">
              {data.account.acls.map((acl) => (
                <Detail.Metadata.TagList.Item key={acl} text={ACLs[acl as keyof typeof ACLs]} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.Push title="Account Bandwidth Info" icon={Icon.PieChart} target={<AccountBandwidthInfo />} />
          <OpenInVultr url={VULTR_LINKS.settingsprofile} />
        </ActionPanel>
      }
    />
  );
}

function AccountBandwidthInfo() {
  const { isLoading, data } = useVultr<{ bandwidth: AccountBandwidth }>("account/bandwidth");

  const markdown = !data
    ? ""
    : `
| | Previous Month | Current Month To Date | Current Month Projected |
|---|----------------|---------------------|-------------------------|
| **Timestamp Start** | ${timestampToString(data.bandwidth.previousMonth.timestampStart)} | ${timestampToString(data.bandwidth.currentMonthToDate.timestampStart)} | ${timestampToString(data.bandwidth.currentMonthProjected.timestampStart)} |
| **Timestamp End** | ${timestampToString(data.bandwidth.previousMonth.timestampEnd)} | ${timestampToString(data.bandwidth.currentMonthToDate.timestampEnd)} | ${timestampToString(data.bandwidth.currentMonthProjected.timestampEnd)} |
| **GB In** | ${data.bandwidth.previousMonth.gb_in} | ${data.bandwidth.currentMonthToDate.gb_in} | ${data.bandwidth.currentMonthProjected.gb_in} |
| **GB Out** | ${data.bandwidth.previousMonth.gb_out} | ${data.bandwidth.currentMonthToDate.gb_out} | ${data.bandwidth.currentMonthProjected.gb_out} |
| **Total Instance Hours** | ${data.bandwidth.previousMonth.totalInstanceHours} | ${data.bandwidth.currentMonthToDate.totalInstanceHours} | ${data.bandwidth.currentMonthProjected.totalInstanceHours} |
| **Total Instance Count** | ${data.bandwidth.previousMonth.totalInstanceCount} | ${data.bandwidth.currentMonthToDate.totalInstanceCount} | ${data.bandwidth.currentMonthProjected.totalInstanceCount} |
| **Instance Bandwidth Credits** | ${data.bandwidth.previousMonth.instanceBandwidthCredits} | ${data.bandwidth.currentMonthToDate.instanceBandwidthCredits} | ${data.bandwidth.currentMonthProjected.instanceBandwidthCredits} |
| **Free Bandwidth Credits** | ${data.bandwidth.previousMonth.freeBandwidthCredits} | ${data.bandwidth.currentMonthToDate.freeBandwidthCredits} | ${data.bandwidth.currentMonthProjected.freeBandwidthCredits} |
| **Purchase dBandwidth Credits** | ${data.bandwidth.previousMonth.purchasedBandwidthCredits} | ${data.bandwidth.currentMonthToDate.purchasedBandwidthCredits} | ${data.bandwidth.currentMonthProjected.purchasedBandwidthCredits} |
| **Overage** | ${data.bandwidth.previousMonth.overage} | ${data.bandwidth.currentMonthToDate.overage} | ${data.bandwidth.currentMonthProjected.overage} |
| **Overage Unit Cost** | ${data.bandwidth.previousMonth.overage_unit_cost} | ${data.bandwidth.currentMonthToDate.overage_unit_cost} | ${data.bandwidth.currentMonthProjected.overage_unit_cost} |
| **Overage Cost** | ${data.bandwidth.previousMonth.overage_cost} | ${data.bandwidth.currentMonthToDate.overage_cost} | ${data.bandwidth.currentMonthProjected.overage_cost} |
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={"## Account Bandwidth Info" + markdown}
      actions={
        <ActionPanel>
          <OpenInVultr url={VULTR_LINKS.bandwidthUsage} />
        </ActionPanel>
      }
    />
  );
}
