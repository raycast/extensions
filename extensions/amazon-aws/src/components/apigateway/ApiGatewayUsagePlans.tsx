import { UsagePlan } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useApiGatewayUsagePlans } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function ApiGatewayUsagePlans({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { usagePlans, error, isLoading, revalidate } = useApiGatewayUsagePlans();

  const navigationTitle = `Usage Plans for ${apiName}`;

  // Filter usage plans that are associated with this API
  const filteredUsagePlans = usagePlans?.filter((plan) => {
    return plan.apiStages?.some((stage) => stage.apiId === apiId);
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter usage plans by name..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : filteredUsagePlans?.length === 0 ? (
        <List.EmptyView title="No Usage Plans" description="No usage plans found for this API" icon={Icon.Calendar} />
      ) : (
        filteredUsagePlans?.map((plan) => <UsagePlanItem key={plan.id} usagePlan={plan} apiId={apiId} />)
      )}
    </List>
  );
}

function UsagePlanItem({ usagePlan, apiId }: { usagePlan: UsagePlan; apiId: string }) {
  const throttle = usagePlan.throttle;
  const quota = usagePlan.quota;
  const stages =
    usagePlan.apiStages
      ?.filter((stage) => stage.apiId === apiId)
      .map((stage) => stage.stage)
      .join(", ") || "No stages";

  const throttleText = throttle
    ? `${throttle.rateLimit || "∞"} req/s, ${throttle.burstLimit || "∞"} burst`
    : "No throttle";
  const quotaText = quota ? `${quota.limit || "∞"} requests/${quota.period || ""}` : "No quota";

  return (
    <List.Item
      key={usagePlan.id}
      icon={Icon.Calendar}
      title={usagePlan.name || usagePlan.id || ""}
      subtitle={usagePlan.description}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(usagePlan.id, "AWS::ApiGateway::UsagePlan")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Usage Plan ID" content={usagePlan.id || ""} />
            <Action.CopyToClipboard title="Copy Usage Plan Name" content={usagePlan.name || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { text: stages, tooltip: "Associated Stages" },
        {
          text: throttleText,
          icon: { source: Icon.Gauge, tintColor: Color.Blue },
          tooltip: "Throttle Settings",
        },
        {
          text: quotaText,
          icon: { source: Icon.Clock, tintColor: Color.Orange },
          tooltip: "Quota Settings",
        },
      ]}
    />
  );
}
