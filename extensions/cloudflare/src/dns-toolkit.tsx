/* eslint-disable @raycast/prefer-title-case */

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api';
import { FormValidation, useCachedPromise, useForm } from '@raycast/utils';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { analyzeDnsHealth, DnsHealthSeverity } from './dns-health';
import { dnsRecordToCreate, isProxiableRecordType } from './dns-utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { DnsBatchOperations, DnsRecord, Dnssec, Zone } from './service';
import { getSiteUrl, handleNetworkError } from './utils';

interface ZoneContext {
  accountId: string;
  accountName: string;
  zone: Zone;
}

type BulkAction = 'set-ttl' | 'set-proxied' | 'add-tag' | 'delete' | 'copy';

function Command() {
  const { isLoading, data: zones = [] } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const results = await Promise.all(
        accounts.map(async (account) =>
          (await getCloudflareService().listZones(account)).map((zone) => ({
            accountId: account.id,
            accountName: account.name,
            zone,
          })),
        ),
      );
      return results.flat();
    },
    [],
    { onError: handleNetworkError },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Cloudflare zones">
      {zones.map((context) => (
        <List.Item
          key={context.zone.id}
          icon={Icon.Network}
          title={context.zone.name}
          subtitle={context.accountName}
          accessories={[{ tag: context.zone.status }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Heartbeat}
                title="Check DNS Health"
                target={<DnsHealthView context={context} />}
              />
              <Action.Push
                icon={Icon.Shield}
                title="Manage DNSSEC"
                target={<DnssecView zone={context.zone} />}
              />
              <Action.Push
                icon={Icon.Pencil}
                title="Bulk Manage Records"
                target={<BulkDnsView source={context} zones={zones} />}
              />
              <Action.Push
                icon={Icon.Upload}
                title="Import Zone File"
                target={<ImportDnsView zone={context.zone} />}
              />
              <Action
                icon={Icon.Download}
                title="Export Zone File"
                onAction={() => exportZoneFile(context.zone)}
              />
              <Action.OpenInBrowser
                title="Open DNS Records on Cloudflare"
                url={`${getSiteUrl(context.accountId, context.zone.name)}/dns/records`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function DnsHealthView({ context }: { context: ZoneContext }) {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const [records, dnssec] = await Promise.all([
        getCloudflareService().listDnsRecords(context.zone.id),
        getCloudflareService().getDnssec(context.zone.id),
      ]);
      return {
        report: analyzeDnsHealth(context.zone.name, records, dnssec),
        records,
      };
    },
    [],
    { onError: handleNetworkError },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search DNS findings">
      {data && (
        <List.Section title={`Health Score: ${data.report.score}/100`}>
          {data.report.findings.length === 0 ? (
            <List.Item
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              title="No heuristic issues found"
              subtitle="DNS configuration passed the available checks"
            />
          ) : (
            data.report.findings.map((finding) => (
              <List.Item
                key={finding.id}
                icon={getFindingIcon(finding.severity)}
                title={finding.title}
                subtitle={finding.description}
                accessories={[{ tag: finding.severity }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Finding"
                      content={`${finding.title}: ${finding.description}`}
                    />
                    {finding.recordIds && (
                      <Action.CopyToClipboard
                        title="Copy Affected Record Ids"
                        content={finding.recordIds.join('\n')}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))
          )}
        </List.Section>
      )}
      {!isLoading && !data && (
        <List.EmptyView title="Could Not Check DNS Health" />
      )}
    </List>
  );
}

function DnssecView({ zone }: { zone: Zone }) {
  const {
    isLoading,
    data: dnssec,
    revalidate,
  } = useCachedPromise(
    async () => getCloudflareService().getDnssec(zone.id),
    [],
    { onError: handleNetworkError },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {dnssec && (
        <List.Item
          icon={getDnssecIcon(dnssec.status)}
          title={`DNSSEC ${dnssec.status}`}
          subtitle={zone.name}
          detail={<DnssecDetail dnssec={dnssec} />}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Shield}
                title={
                  dnssec.status === 'active'
                    ? 'Disable DNSSEC'
                    : 'Enable DNSSEC'
                }
                style={
                  dnssec.status === 'active'
                    ? Action.Style.Destructive
                    : Action.Style.Regular
                }
                onAction={() =>
                  updateDnssec(
                    zone,
                    dnssec.status === 'active' ? 'disabled' : 'active',
                    revalidate,
                  )
                }
              />
              {dnssec.ds && (
                <Action.CopyToClipboard
                  title="Copy DS Record"
                  content={dnssec.ds}
                />
              )}
              {dnssec.publicKey && (
                <Action.CopyToClipboard
                  title="Copy Public Key"
                  content={dnssec.publicKey}
                />
              )}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function DnssecDetail({ dnssec }: { dnssec: Dnssec }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={dnssec.status}
          />
          <List.Item.Detail.Metadata.Label
            title="Modified"
            text={
              dnssec.modifiedOn
                ? new Date(dnssec.modifiedOn).toLocaleString()
                : 'Unknown'
            }
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="DS Record"
            text={dnssec.ds || 'Not available'}
          />
          <List.Item.Detail.Metadata.Label
            title="Algorithm"
            text={dnssec.algorithm || 'Unknown'}
          />
          <List.Item.Detail.Metadata.Label
            title="Digest Algorithm"
            text={dnssec.digestAlgorithm || 'Unknown'}
          />
          <List.Item.Detail.Metadata.Label
            title="Digest Type"
            text={dnssec.digestType || 'Unknown'}
          />
          <List.Item.Detail.Metadata.Label
            title="Key Tag"
            text={dnssec.keyTag?.toString() || 'Unknown'}
          />
          <List.Item.Detail.Metadata.Label
            title="Key Type"
            text={dnssec.keyType || 'Unknown'}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface BulkFormValues {
  recordIds: string[];
  action: BulkAction;
  ttl: string;
  proxied: boolean;
  tag: string;
  targetZoneId: string;
}

function BulkDnsView({
  source,
  zones,
}: {
  source: ZoneContext;
  zones: ZoneContext[];
}) {
  const { pop } = useNavigation();
  const { isLoading, data: records = [] } = useCachedPromise(
    async () => getCloudflareService().listDnsRecords(source.zone.id),
    [],
    { onError: handleNetworkError },
  );
  const { handleSubmit, itemProps, values } = useForm<BulkFormValues>({
    initialValues: {
      action: 'set-ttl',
      ttl: '300',
      proxied: true,
      recordIds: [],
    },
    validation: {
      recordIds(value) {
        if (!value?.length) return 'Select at least one DNS record.';
      },
      ttl(value) {
        if (values.action !== 'set-ttl') return;
        const ttl = Number(value);
        if (!Number.isInteger(ttl) || (ttl !== 1 && ttl < 30) || ttl > 86400) {
          return 'Use 1 for automatic TTL or 30–86400 seconds.';
        }
      },
      tag(value) {
        if (values.action === 'add-tag' && !value?.trim())
          return 'Enter a tag.';
      },
      targetZoneId(value) {
        if (values.action === 'copy' && !value)
          return 'Choose a destination zone.';
      },
    },
    async onSubmit(values) {
      const selected = records.filter((record) =>
        values.recordIds.includes(record.id),
      );
      const destination = zones.find(
        ({ zone }) => zone.id === values.targetZoneId,
      );
      const confirmed = await confirmAlert({
        title: getBulkActionTitle(values.action),
        message: getBulkConfirmation(
          values.action,
          selected.length,
          destination?.zone.name,
        ),
        primaryAction: {
          title:
            values.action === 'delete' ? 'Delete Records' : 'Apply Changes',
          style:
            values.action === 'delete'
              ? Alert.ActionStyle.Destructive
              : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) return;

      const toast = await showToast(
        Toast.Style.Animated,
        getBulkActionTitle(values.action),
      );
      try {
        const { zoneId, operations } = buildBulkOperations(
          source.zone,
          destination?.zone,
          selected,
          values,
        );
        const result = await getCloudflareService().batchDnsRecords(
          zoneId,
          operations,
        );
        toast.style = Toast.Style.Success;
        toast.title = 'Updated DNS Records';
        toast.message = `${result.deleted} deleted, ${result.patched} updated, ${result.posted} copied`;
        pop();
      } catch (error) {
        await toast.hide();
        await handleNetworkError(error);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={values.action === 'delete' ? Icon.Trash : Icon.Pencil}
            title={getBulkActionTitle(values.action)}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Source Zone" text={source.zone.name} />
      <Form.TagPicker title="Records" {...itemProps.recordIds}>
        {records.map((record) => (
          <Form.TagPicker.Item
            key={record.id}
            value={record.id}
            title={`${record.type} ${record.name} → ${record.content}`}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id="action"
        title="Action"
        value={values.action}
        onChange={(value) => itemProps.action.onChange?.(value as BulkAction)}
      >
        <Form.Dropdown.Item title="Set TTL" value="set-ttl" />
        <Form.Dropdown.Item title="Set Proxy Status" value="set-proxied" />
        <Form.Dropdown.Item title="Add Tag" value="add-tag" />
        <Form.Dropdown.Item title="Copy to Another Zone" value="copy" />
        <Form.Dropdown.Item title="Delete" value="delete" />
      </Form.Dropdown>
      {values.action === 'set-ttl' && (
        <Form.TextField
          title="TTL"
          info="Use 1 for automatic TTL."
          {...itemProps.ttl}
        />
      )}
      {values.action === 'set-proxied' && (
        <Form.Checkbox
          label="Proxy selected A, AAAA, and CNAME records"
          {...itemProps.proxied}
        />
      )}
      {values.action === 'add-tag' && (
        <Form.TextField
          title="Tag"
          placeholder="team=platform"
          {...itemProps.tag}
        />
      )}
      {values.action === 'copy' && (
        <Form.Dropdown title="Destination Zone" {...itemProps.targetZoneId}>
          {zones
            .filter(({ zone }) => zone.id !== source.zone.id)
            .map(({ accountName, zone }) => (
              <Form.Dropdown.Item
                key={zone.id}
                title={`${zone.name} — ${accountName}`}
                value={zone.id}
              />
            ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

function ImportDnsView({ zone }: { zone: Zone }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{
    files: string[];
    proxied: boolean;
  }>({
    initialValues: { files: [], proxied: false },
    validation: { files: FormValidation.Required },
    async onSubmit(values) {
      const filePath = values.files[0];
      if (!filePath) return;
      const contents = await readFile(filePath, 'utf8');
      if (Buffer.byteLength(contents) > 256 * 1024) {
        await showToast(
          Toast.Style.Failure,
          'Zone file exceeds Cloudflare’s 256 KiB limit',
        );
        return;
      }
      const confirmed = await confirmAlert({
        title: 'Import DNS Records?',
        message: `Import ${path.basename(filePath)} into ${zone.name}? Existing records are not automatically removed.`,
        primaryAction: { title: 'Import Records' },
      });
      if (!confirmed) return;

      const toast = await showToast(
        Toast.Style.Animated,
        'Importing DNS Records',
      );
      try {
        const result = await getCloudflareService().importDnsRecords(
          zone.id,
          contents,
          values.proxied,
        );
        toast.style = Toast.Style.Success;
        toast.title = 'Imported DNS Records';
        toast.message = `${result.recordsAdded} of ${result.totalRecordsParsed} parsed records added`;
        pop();
      } catch (error) {
        await toast.hide();
        await handleNetworkError(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Upload}
            title="Import Records"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Destination Zone" text={zone.name} />
      <Form.FilePicker
        title="BIND Zone File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.files}
      />
      <Form.Checkbox
        label="Proxy eligible imported records"
        {...itemProps.proxied}
      />
    </Form>
  );
}

function buildBulkOperations(
  source: Zone,
  destination: Zone | undefined,
  records: DnsRecord[],
  values: BulkFormValues,
): { zoneId: string; operations: DnsBatchOperations } {
  switch (values.action) {
    case 'set-ttl':
      return {
        zoneId: source.id,
        operations: {
          patches: records.map((record) => ({
            id: record.id,
            ttl: Number(values.ttl),
          })),
        },
      };
    case 'set-proxied': {
      const proxiableRecords = records.filter((record) =>
        isProxiableRecordType(record.type),
      );
      if (proxiableRecords.length === 0) {
        throw new Error(
          'Select at least one A, AAAA, or CNAME record to change proxy status.',
        );
      }
      return {
        zoneId: source.id,
        operations: {
          patches: proxiableRecords.map((record) => ({
            id: record.id,
            proxied: values.proxied,
          })),
        },
      };
    }
    case 'add-tag':
      return {
        zoneId: source.id,
        operations: {
          patches: records.map((record) => ({
            id: record.id,
            tags: Array.from(new Set([...record.tags, values.tag.trim()])),
          })),
        },
      };
    case 'delete':
      return {
        zoneId: source.id,
        operations: { deletes: records.map((record) => ({ id: record.id })) },
      };
    case 'copy':
      if (!destination) throw new Error('Choose a destination zone.');
      return {
        zoneId: destination.id,
        operations: {
          posts: records.map((record) =>
            dnsRecordToCreate(record, source.name, destination.name),
          ),
        },
      };
  }
}

async function exportZoneFile(zone: Zone) {
  const toast = await showToast(Toast.Style.Animated, 'Exporting DNS Records');
  try {
    const contents = await getCloudflareService().exportDnsRecords(zone.id);
    const directory = path.join(homedir(), 'Downloads');
    await mkdir(directory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(directory, `${zone.name}-${timestamp}.txt`);
    await writeFile(filePath, contents, { encoding: 'utf8', flag: 'wx' });
    toast.style = Toast.Style.Success;
    toast.title = 'Exported DNS Records';
    toast.message = filePath;
    await showInFinder(filePath);
  } catch (error) {
    await toast.hide();
    await handleNetworkError(error);
  }
}

async function updateDnssec(
  zone: Zone,
  status: 'active' | 'disabled',
  revalidate: () => void,
) {
  const confirmed = await confirmAlert({
    title: `${status === 'active' ? 'Enable' : 'Disable'} DNSSEC?`,
    message:
      status === 'active'
        ? `Enable DNSSEC for ${zone.name}? You must publish the generated DS record with the registrar.`
        : `Disable DNSSEC for ${zone.name}? Remove the DS record at the registrar first to avoid resolution failures.`,
    primaryAction: {
      title: status === 'active' ? 'Enable DNSSEC' : 'Disable DNSSEC',
      style:
        status === 'active'
          ? Alert.ActionStyle.Default
          : Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast(Toast.Style.Animated, 'Updating DNSSEC');
  try {
    await getCloudflareService().setDnssecStatus(zone.id, status);
    toast.style = Toast.Style.Success;
    toast.title = `DNSSEC ${status === 'active' ? 'Enabled' : 'Disabled'}`;
    revalidate();
  } catch (error) {
    await toast.hide();
    await handleNetworkError(error);
  }
}

function getFindingIcon(severity: DnsHealthSeverity) {
  if (severity === 'critical')
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (severity === 'warning')
    return { source: Icon.ExclamationMark, tintColor: Color.Orange };
  return { source: Icon.Info, tintColor: Color.Blue };
}

function getDnssecIcon(status: Dnssec['status']) {
  if (status === 'active')
    return { source: Icon.Shield, tintColor: Color.Green };
  if (status === 'error') return { source: Icon.Shield, tintColor: Color.Red };
  return { source: Icon.Shield, tintColor: Color.Orange };
}

function getBulkActionTitle(action: BulkAction): string {
  switch (action) {
    case 'set-ttl':
      return 'Update Record TTLs';
    case 'set-proxied':
      return 'Update Proxy Status';
    case 'add-tag':
      return 'Add Record Tags';
    case 'delete':
      return 'Delete DNS Records';
    case 'copy':
      return 'Copy DNS Records';
  }
}

function getBulkConfirmation(
  action: BulkAction,
  count: number,
  destination?: string,
): string {
  if (action === 'delete')
    return `Permanently delete ${count} selected DNS record${count === 1 ? '' : 's'}?`;
  if (action === 'copy')
    return `Copy ${count} selected DNS record${count === 1 ? '' : 's'} to ${destination}?`;
  return `Apply this change to ${count} selected DNS record${count === 1 ? '' : 's'}?`;
}

export default withCloudflareAccessToken(Command);
