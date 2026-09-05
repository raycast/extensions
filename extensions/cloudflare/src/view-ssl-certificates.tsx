import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { certificateHealth } from './insights-utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import type { CertificatePack } from './service';
import { handleNetworkError } from './utils';
import {
  ZoneResourceContext,
  ZoneResourcePicker,
} from './zone-resource-picker';

function statusColor(pack: CertificatePack): Color {
  const health = certificateHealth(
    pack.status,
    pack.certificates[0]?.expiresOn,
  );
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
        const certificate = pack.certificates[0];
        return (
          <List.Item
            key={pack.id}
            icon={{ source: Icon.Lock, tintColor: statusColor(pack) }}
            title={pack.hosts[0] ?? pack.type}
            subtitle={pack.hosts.slice(1).join(', ') || pack.type}
            keywords={[
              pack.type,
              pack.certificateAuthority ?? '',
              ...pack.hosts,
            ]}
            accessories={[
              { tag: { value: pack.status, color: statusColor(pack) } },
              ...(certificate?.expiresOn
                ? [
                    {
                      date: new Date(certificate.expiresOn),
                      tooltip: `Expires: ${new Date(certificate.expiresOn).toLocaleString()}`,
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
                        text={pack.status}
                        color={statusColor(pack)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={pack.type}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Certificate Authority"
                      text={
                        certificate?.issuer ??
                        pack.certificateAuthority ??
                        'Not provided'
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Signature"
                      text={certificate?.signature ?? 'Not provided'}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Expires"
                      text={
                        certificate?.expiresOn
                          ? new Date(certificate.expiresOn).toLocaleString()
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
