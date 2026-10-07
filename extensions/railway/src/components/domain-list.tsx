import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ServiceContext } from "../cli";
import {
  CustomDomainGQL,
  ServiceDomainGQL,
  createServiceDomain,
  fetchDomains,
  retryDomainCertificate,
  serviceUrl,
} from "../railway";

interface DomainListProps {
  context: ServiceContext;
  serviceName: string;
  environmentName: string;
  onChange?: () => void;
}

export function DomainList({ context, serviceName, environmentName, onChange }: DomainListProps) {
  const { isLoading, data, revalidate } = useCachedPromise(fetchDomains, [
    context.projectId,
    context.environmentId,
    context.serviceId,
  ]);
  const serviceDomains = data?.serviceDomains ?? [];
  const customDomains = data?.customDomains ?? [];

  const refresh = () => {
    revalidate();
    onChange?.();
  };

  async function handleGenerate() {
    const confirmed = await confirmAlert({
      title: `Generate a domain for ${serviceName}?`,
      message: `${serviceName} in ${environmentName} will be reachable on a public Railway domain.`,
      primaryAction: { title: "Generate" },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Generating domain" });
    try {
      const domain = await createServiceDomain(context.environmentId, context.serviceId);
      toast.style = Toast.Style.Success;
      toast.title = "Generated domain";
      toast.message = domain?.domain;
      refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to generate domain" });
    }
  }

  // Like `railway domain`, a Railway domain is only offered while the service has none
  const generateAction =
    serviceDomains.length === 0 ? (
      <Action
        title="Generate Railway Domain"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={handleGenerate}
      />
    ) : null;

  const commonActions = (
    <>
      {generateAction}
      <Action.OpenInBrowser
        title="Open in Railway"
        url={serviceUrl(context.projectId, context.serviceId, context.environmentId)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </>
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${serviceName} · Domains`} searchBarPlaceholder="Search domains">
      {!isLoading && serviceDomains.length === 0 && customDomains.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Domains"
          description={`${serviceName} isn't reachable from the internet yet`}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      <List.Section title="Railway Domains">
        {serviceDomains.map((domain) => (
          <List.Item
            key={domain.id}
            icon={Icon.Globe}
            title={domain.domain}
            accessories={portAccessory(domain)}
            actions={
              <ActionPanel>
                <DomainLinkActions domain={domain} />
                <ActionPanel.Section>{commonActions}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Custom Domains">
        {customDomains.map((domain) => {
          const status = customDomainStatus(domain);
          return (
            <List.Item
              key={domain.id}
              icon={{ source: Icon.Globe, tintColor: status.color }}
              title={domain.domain}
              accessories={[...portAccessory(domain), { tag: { value: status.label, color: status.color } }]}
              actions={
                <ActionPanel>
                  <DomainLinkActions domain={domain}>
                    <Action.Push
                      title="Show DNS Records"
                      icon={Icon.List}
                      target={<CustomDomainDetail domain={domain} />}
                    />
                  </DomainLinkActions>
                  {domain.status.certificateRetryable && (
                    <ActionPanel.Section>
                      <Action
                        title="Retry Certificate"
                        icon={Icon.ArrowClockwise}
                        onAction={async () => {
                          const toast = await showToast({
                            style: Toast.Style.Animated,
                            title: "Requesting certificate",
                          });
                          try {
                            await retryDomainCertificate(domain.id);
                            toast.style = Toast.Style.Success;
                            toast.title = "Certificate retry requested";
                            revalidate();
                          } catch (error) {
                            await showFailureToast(error, { title: "Failed to retry certificate" });
                          }
                        }}
                      />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>{commonActions}</ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function DomainLinkActions({ domain, children }: { domain: ServiceDomainGQL; children?: React.ReactNode }) {
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open URL" url={`https://${domain.domain}`} />
      {children}
      <Action.CopyToClipboard
        title="Copy URL"
        content={`https://${domain.domain}`}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    </ActionPanel.Section>
  );
}

function portAccessory(domain: ServiceDomainGQL): List.Item.Accessory[] {
  return domain.targetPort ? [{ text: `:${domain.targetPort}`, tooltip: "Target port" }] : [];
}

function customDomainStatus(domain: CustomDomainGQL): { label: string; color: Color } {
  const { certificateStatus, dnsRecords } = domain.status;
  if (dnsRecords.some((r) => r.status === "DNS_RECORD_STATUS_REQUIRES_UPDATE")) {
    return { label: "DNS Update Required", color: Color.Orange };
  }
  switch (certificateStatus) {
    case "CERTIFICATE_STATUS_TYPE_VALID":
      return { label: "Active", color: Color.Green };
    case "CERTIFICATE_STATUS_TYPE_ISSUE_FAILED":
      return { label: "Certificate Failed", color: Color.Red };
    case "CERTIFICATE_STATUS_TYPE_ISSUING":
    case "CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP":
      return { label: "Issuing Certificate", color: Color.Blue };
    default:
      return { label: "Pending", color: Color.SecondaryText };
  }
}

const recordTypeLabel = (recordType: string) => recordType.replace("DNS_RECORD_TYPE_", "");

function CustomDomainDetail({ domain }: { domain: CustomDomainGQL }) {
  const status = customDomainStatus(domain);
  const records = domain.status.dnsRecords;

  const markdown = [
    `# ${domain.domain}`,
    "Add these records at your DNS provider so the domain points to Railway.",
    "| Type | Name | Value | Status |",
    "| --- | --- | --- | --- |",
    ...records.map(
      (r) =>
        `| ${recordTypeLabel(r.recordType)} | \`${r.hostlabel || "@"}\` | \`${r.requiredValue}\` | ${
          r.status === "DNS_RECORD_STATUS_PROPAGATED" ? "✅ Propagated" : "⚠️ Waiting for update"
        } |`,
    ),
    ...(domain.status.certificateErrorMessage ? [`> ${domain.status.certificateErrorMessage}`] : []),
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={domain.domain}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.label} color={status.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Verified"
            icon={domain.status.verified ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            text={domain.status.verified ? "Yes" : "No"}
          />
          {domain.targetPort && <Detail.Metadata.Label title="Target Port" text={`${domain.targetPort}`} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="URL" target={`https://${domain.domain}`} text={domain.domain} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open URL" url={`https://${domain.domain}`} />
          {records.map((r) => (
            <Action.CopyToClipboard
              key={`${r.recordType}-${r.fqdn}`}
              title={`Copy ${recordTypeLabel(r.recordType)} Value for ${r.hostlabel || "@"}`}
              content={r.requiredValue}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
