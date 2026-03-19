import { BasePathMapping } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useApiGatewayBasePathMappings } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

interface ApiGatewayBasePathsProps {
  domainName: string;
}

/**
 * Component to display base path mappings for a custom domain
 */
export default function ApiGatewayBasePaths({ domainName }: ApiGatewayBasePathsProps) {
  const { basePathMappings, error, isLoading, revalidate } = useApiGatewayBasePathMappings(domainName);

  const navigationTitle = `Base Path Mappings for ${domainName}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter mappings by path..."
      navigationTitle={navigationTitle}
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : basePathMappings?.length === 0 ? (
        <List.EmptyView
          title="No Base Path Mappings"
          description="No base path mappings configured for this domain"
          icon={Icon.Link}
        />
      ) : (
        basePathMappings?.map((mapping) => (
          <BasePathMappingItem key={`${mapping.basePath}-${mapping.restApiId}`} mapping={mapping} />
        ))
      )}
    </List>
  );
}

interface BasePathMappingItemProps {
  mapping: BasePathMapping;
}

function BasePathMappingItem({ mapping }: BasePathMappingItemProps) {
  const basePath = mapping.basePath || "(none)";
  const displayPath = basePath === "(none)" ? "/" : `/${basePath}`;

  return (
    <List.Item
      key={`${mapping.basePath}-${mapping.restApiId}`}
      icon={Icon.Link}
      title={displayPath}
      subtitle={`API: ${mapping.restApiId || "Unknown"} → Stage: ${mapping.stage || "Unknown"}`}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(mapping.restApiId, "AWS::ApiGateway::RestApi")} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Base Path" content={basePath} />
            <Action.CopyToClipboard title="Copy API ID" content={mapping.restApiId || ""} />
            <Action.CopyToClipboard title="Copy Stage" content={mapping.stage || ""} />
            <AwsAction.ExportResponse response={mapping} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: mapping.restApiId || "",
          icon: Icon.Code,
          tooltip: "REST API ID",
        },
        {
          text: mapping.stage || "",
          icon: Icon.Layers,
          tooltip: "Stage",
        },
      ]}
    />
  );
}
