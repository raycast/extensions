import { DomainName } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useApiGatewayDomainNames } from "../../hooks/use-apigateway";
import AWSProfileDropdown from "../searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";
import ApiGatewayBasePaths from "./ApiGatewayBasePaths";

/**
 * Component to display and manage API Gateway custom domain names
 */
export default function ApiGatewayDomains() {
  const { domainNames, error, isLoading, revalidate } = useApiGatewayDomainNames();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter domains by name..."
      navigationTitle="Custom Domain Names"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : domainNames?.length === 0 ? (
        <List.EmptyView title="No Custom Domains" description="No custom domain names configured" icon={Icon.Globe} />
      ) : (
        domainNames?.map((domain) => <DomainItem key={domain.domainName} domain={domain} />)
      )}
    </List>
  );
}

interface DomainItemProps {
  domain: DomainName;
}

function DomainItem({ domain }: DomainItemProps) {
  const endpointType = domain.endpointConfiguration?.types?.[0] || "EDGE";
  const securityPolicy = domain.securityPolicy || "TLS_1_0";
  const certificateExpiry = getCertificateExpiryInfo(domain);

  return (
    <List.Item
      key={domain.domainName}
      icon={Icon.Globe}
      title={domain.domainName || ""}
      subtitle={domain.distributionDomainName || domain.regionalDomainName || ""}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Base Path Mappings"
            icon={Icon.Link}
            target={<ApiGatewayBasePaths domainName={domain.domainName || ""} />}
          />
          <AwsAction.Console url={resourceToConsoleLink(domain.domainName, "AWS::ApiGateway::DomainName")} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Domain Name" content={domain.domainName || ""} />
            {domain.distributionDomainName && (
              <Action.CopyToClipboard title="Copy CloudFront Domain" content={domain.distributionDomainName} />
            )}
            {domain.regionalDomainName && (
              <Action.CopyToClipboard title="Copy Regional Domain" content={domain.regionalDomainName} />
            )}
            {domain.certificateArn && (
              <Action.CopyToClipboard title="Copy Certificate ARN" content={domain.certificateArn} />
            )}
            {domain.regionalCertificateArn && (
              <Action.CopyToClipboard title="Copy Regional Certificate ARN" content={domain.regionalCertificateArn} />
            )}
            <AwsAction.ExportResponse response={domain} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: endpointType,
          icon: getEndpointIcon(endpointType),
          tooltip: "Endpoint Type",
        },
        {
          text: securityPolicy,
          icon: Icon.Shield,
          tooltip: "Security Policy (TLS Version)",
        },
        ...(certificateExpiry.text
          ? [
              {
                text: certificateExpiry.text,
                icon: certificateExpiry.icon,
                tooltip: certificateExpiry.tooltip,
              },
            ]
          : []),
      ]}
    />
  );
}

/**
 * Returns the appropriate icon for an endpoint type
 */
function getEndpointIcon(type: string): { source: Icon; tintColor: Color } {
  switch (type) {
    case "EDGE":
      return { source: Icon.Globe, tintColor: Color.Blue };
    case "REGIONAL":
      return { source: Icon.Building, tintColor: Color.Green };
    case "PRIVATE":
      return { source: Icon.Lock, tintColor: Color.Orange };
    default:
      return { source: Icon.Globe, tintColor: Color.SecondaryText };
  }
}

/**
 * Returns certificate expiry information for display
 */
function getCertificateExpiryInfo(domain: DomainName): {
  text: string;
  icon: { source: Icon; tintColor: Color };
  tooltip: string;
} {
  const expirationDate = domain.certificateUploadDate;

  if (!expirationDate) {
    return { text: "", icon: { source: Icon.Calendar, tintColor: Color.SecondaryText }, tooltip: "" };
  }

  const uploadDate = new Date(expirationDate);
  const formattedDate = uploadDate.toLocaleDateString();

  return {
    text: formattedDate,
    icon: { source: Icon.Calendar, tintColor: Color.SecondaryText },
    tooltip: `Certificate uploaded: ${formattedDate}`,
  };
}
