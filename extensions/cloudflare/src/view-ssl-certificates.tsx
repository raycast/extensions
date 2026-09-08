import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { certificatePackHealth } from './insights-utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { handleNetworkError } from './utils';
import {
  ZoneResourceContext,
  ZoneResourcePicker,
} from './zone-resource-picker';

function statusColor(health: 'healthy' | 'warning' | 'error'): Color {
  if (health === 'healthy') return Color.Green;
  if (health === 'warning') return Color.Yellow;
  return Color.Red;
}

function CertificatesView({ context }: { context: ZoneResourceContext }) {
  const { isLoading, data: packs = [] } = useCachedPromise(
    async () => getCloudflareService().listCertificatePacks(context.zone.id),
    [],
    { onError: handleNetworkError },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${context.zone.name} Certificates`}
      searchBarPlaceholder="Search certificate hosts, types, and issuers"
    >
      {!isLoading && packs.length === 0 && (
        <List.EmptyView
          icon={Icon.Lock}
          title="No Certificate Packs Found"
          description="Cloudflare did not return certificate packs for this zone."
        />
      )}
      {packs.map((pack) => {
        const summary = certificatePackHealth(
          pack.status,
          pack.certificates,
          pack.validationErrors,
        );
        const issuers = [
          ...new Set(
            pack.certificates
              .map((certificate) => certificate.issuer)
              .filter((issuer): issuer is string => Boolean(issuer)),
          ),
        ];
        const signatures = [
          ...new Set(
            pack.certificates
              .map((certificate) => certificate.signature)
              .filter((signature): signature is string => Boolean(signature)),
          ),
        ];
        const certificateDetails = pack.certificates
          .map((certificate) => {
            const expires = certificate.expiresOn
              ? new Date(certificate.expiresOn).toLocaleString()
              : 'expiry not provided';
            return `${certificate.id}: ${certificate.status}, expires ${expires}`;
          })
          .join('\n');
        return (
          <List.Item
            key={pack.id}
            icon={{
              source: Icon.Lock,
              tintColor: statusColor(summary.health),
            }}
            title={pack.hosts[0] ?? pack.type}
            subtitle={pack.hosts.slice(1).join(', ') || pack.type}
            keywords={[
              pack.type,
              pack.certificateAuthority ?? '',
              ...pack.hosts,
            ]}
            accessories={[
              {
                tag: {
                  value: summary.health,
                  color: statusColor(summary.health),
                },
              },
              ...(summary.earliestExpiresOn
                ? [
                    {
                      date: new Date(summary.earliestExpiresOn),
                      tooltip: `Earliest expiry: ${new Date(summary.earliestExpiresOn).toLocaleString()}`,
                    },
                  ]
                : []),
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${pack.status} (${summary.health})`}
                        color={statusColor(summary.health)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={pack.type}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Certificate Authority"
                      text={
                        issuers.join(', ') ||
                        pack.certificateAuthority ||
                        'Not provided'
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Signature"
                      text={signatures.join(', ') || 'Not provided'}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Earliest Expiry"
                      text={
                        summary.earliestExpiresOn
                          ? new Date(summary.earliestExpiresOn).toLocaleString()
                          : 'Not provided'
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Validation Method"
                      text={pack.validationMethod ?? 'Not provided'}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Hosts"
                      text={pack.hosts.join(', ') || 'None'}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Certificates"
                      text={certificateDetails || 'None'}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Validation Errors"
                      text={pack.validationErrors.join('\n') || 'None'}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Certificate Pack ID"
                      text={pack.id}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Certificate Hosts"
                  content={pack.hosts.join('\n')}
                />
                <Action.CopyToClipboard
                  title="Copy Certificate Pack ID"
                  content={pack.id}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Command() {
  return (
    <ZoneResourcePicker
      actionTitle="Show SSL Certificates"
      icon={Icon.Lock}
      renderTarget={(context) => <CertificatesView context={context} />}
    />
  );
}

export default withCloudflareAccessToken(Command);
