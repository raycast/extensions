import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import useVultr from "./lib/hooks/useVultr";
import { Account, AccountBandwidth } from "./lib/types/account";
import { timestampToString } from "./lib/utils";

export default function AccountInfo() {
    const { isLoading, data } = useVultr<{ account: Account}>("account");
    
    return <Detail isLoading={isLoading} markdown="Account Info" metadata={data && <Detail.Metadata>
        <Detail.Metadata.Label title="Balance" text={data.account.balance.toString()} />
        <Detail.Metadata.Label title="Pending Charges" text={data.account.pending_charges.toString()} />
        <Detail.Metadata.Label title="Name" text={data.account.name} />
        <Detail.Metadata.Label title="Email" text={data.account.email} />
        <Detail.Metadata.TagList title="ACLs">
            {data.account.acls.map(acl => <Detail.Metadata.TagList.Item key={acl} text={acl} />)}
        </Detail.Metadata.TagList>
        <Detail.Metadata.Label title="Last Payment Date" text={data.account.last_payment_date} />
        <Detail.Metadata.Label title="Last Payment Amount" text={data.account.last_payment_amount.toString()} />
    </Detail.Metadata>} actions={<ActionPanel>
        <Action.Push title="Account Bandwidth Info" icon={Icon.PieChart} target={<AccountBandwidthInfo />} />
    </ActionPanel>} />
}

function AccountBandwidthInfo() {
    const { isLoading, data } = useVultr<{ bandwidth: AccountBandwidth }>("account/bandwidth");

    return <Detail isLoading={isLoading} markdown="Account Bandwidth Info" metadata={data && <Detail.Metadata>
        <Detail.Metadata.Label title="Previous Month" />
        <Detail.Metadata.Label title="|" />
        <Detail.Metadata.Label title="Timestamp Start" text={timestampToString(data.bandwidth.previousMonth.timestampStart)} />
        <Detail.Metadata.Label title="Timestamp End" text={timestampToString(data.bandwidth.previousMonth.timestampEnd)} />
        <Detail.Metadata.Label title="GB In" text={data.bandwidth.previousMonth.gb_in.toString()} />
        <Detail.Metadata.Label title="GB Out" text={data.bandwidth.previousMonth.gb_out.toString()} />
        <Detail.Metadata.Label title="Total Instance Hours" text={data.bandwidth.previousMonth.totalInstanceHours.toString()} />
        <Detail.Metadata.Label title="Total Instance Count" text={data.bandwidth.previousMonth.totalInstanceCount.toString()} />
        <Detail.Metadata.Label title="Instance Bandwidth Credits" text={data.bandwidth.previousMonth.instanceBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Free Bandwidth Credits" text={data.bandwidth.previousMonth.freeBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Purchase dBandwidth Credits" text={data.bandwidth.previousMonth.purchasedBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Overage" text={data.bandwidth.previousMonth.overage.toString()} />
        <Detail.Metadata.Label title="Overage Unit Cost" text={data.bandwidth.previousMonth.overage_unit_cost.toString()} />
        <Detail.Metadata.Label title="Overage Cost" text={data.bandwidth.previousMonth.overage_cost.toString()} />
        <Detail.Metadata.Separator />

        <Detail.Metadata.Label title="Current Month To Date" />
        <Detail.Metadata.Label title="|" />
        <Detail.Metadata.Label title="Timestamp Start" text={timestampToString(data.bandwidth.currentMonthToDate.timestampStart)} />
        <Detail.Metadata.Label title="Timestamp End" text={timestampToString(data.bandwidth.currentMonthToDate.timestampEnd)} />
        <Detail.Metadata.Label title="GB In" text={data.bandwidth.currentMonthToDate.gb_in.toString()} />
        <Detail.Metadata.Label title="GB Out" text={data.bandwidth.currentMonthToDate.gb_out.toString()} />
        <Detail.Metadata.Label title="Total Instance Hours" text={data.bandwidth.currentMonthToDate.totalInstanceHours.toString()} />
        <Detail.Metadata.Label title="Total Instance Count" text={data.bandwidth.currentMonthToDate.totalInstanceCount.toString()} />
        <Detail.Metadata.Label title="Instance Bandwidth Credits" text={data.bandwidth.currentMonthToDate.instanceBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Free Bandwidth Credits" text={data.bandwidth.currentMonthToDate.freeBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Purchase dBandwidth Credits" text={data.bandwidth.currentMonthToDate.purchasedBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Overage" text={data.bandwidth.currentMonthToDate.overage.toString()} />
        <Detail.Metadata.Label title="Overage Unit Cost" text={data.bandwidth.currentMonthToDate.overage_unit_cost.toString()} />
        <Detail.Metadata.Label title="Overage Cost" text={data.bandwidth.currentMonthToDate.overage_cost.toString()} />
        <Detail.Metadata.Separator />

        <Detail.Metadata.Label title="Current Month Projected" />
        <Detail.Metadata.Label title="|" />
        <Detail.Metadata.Label title="Timestamp Start" text={timestampToString(data.bandwidth.currentMonthProjected.timestampStart)} />
        <Detail.Metadata.Label title="Timestamp End" text={timestampToString(data.bandwidth.currentMonthProjected.timestampEnd)} />
        <Detail.Metadata.Label title="GB In" text={data.bandwidth.currentMonthProjected.gb_in.toString()} />
        <Detail.Metadata.Label title="GB Out" text={data.bandwidth.currentMonthProjected.gb_out.toString()} />
        <Detail.Metadata.Label title="Total Instance Hours" text={data.bandwidth.currentMonthProjected.totalInstanceHours.toString()} />
        <Detail.Metadata.Label title="Total Instance Count" text={data.bandwidth.currentMonthProjected.totalInstanceCount.toString()} />
        <Detail.Metadata.Label title="Instance Bandwidth Credits" text={data.bandwidth.currentMonthProjected.instanceBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Free Bandwidth Credits" text={data.bandwidth.currentMonthProjected.freeBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Purchase dBandwidth Credits" text={data.bandwidth.currentMonthProjected.purchasedBandwidthCredits.toString()} />
        <Detail.Metadata.Label title="Overage" text={data.bandwidth.currentMonthProjected.overage.toString()} />
        <Detail.Metadata.Label title="Overage Unit Cost" text={data.bandwidth.currentMonthProjected.overage_unit_cost.toString()} />
        <Detail.Metadata.Label title="Overage Cost" text={data.bandwidth.currentMonthProjected.overage_cost.toString()} />
    </Detail.Metadata>} />
}