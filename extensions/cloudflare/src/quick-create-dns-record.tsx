/* eslint-disable @raycast/prefer-title-case */

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
} from '@raycast/api';
import { FormValidation, useCachedPromise, useForm } from '@raycast/utils';
import {
  DNS_RECORD_TYPES,
  isProxiableRecordType,
  normalizeDnsRecordContent,
  normalizeDnsRecordName,
} from './dns-utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';
import { handleNetworkError } from './utils';

interface FormValues {
  zoneId: string;
  type: string;
  name: string;
  content: string;
  ttl: string;
  proxied: boolean;
  priority: string;
  comment: string;
}

const TTLS = [
  ['1', 'Auto'],
  ['60', '1 minute'],
  ['300', '5 minutes'],
  ['900', '15 minutes'],
  ['3600', '1 hour'],
  ['86400', '1 day'],
] as const;

function Command() {
  const { isLoading, data: zones = [] } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const groups = await Promise.all(
        accounts.map(async (account) =>
          (await getCloudflareService().listZones(account)).map((zone) => ({
            account,
            zone,
          })),
        ),
      );
      return groups.flat();
    },
    [],
    { onError: handleNetworkError },
  );

  const { handleSubmit, itemProps, values, reset } = useForm<FormValues>({
    initialValues: {
      type: 'A',
      ttl: '1',
      proxied: true,
      priority: '10',
    },
    validation: {
      zoneId: FormValidation.Required,
      type: FormValidation.Required,
      name: FormValidation.Required,
      content: FormValidation.Required,
      priority(value) {
        if (values.type !== 'MX') return;
        const priority = Number(value);
        if (!Number.isInteger(priority) || priority < 0 || priority > 65535) {
          return 'Priority must be a whole number from 0 to 65535.';
        }
      },
      comment(value) {
        if (value && value.length > 100) {
          return 'Comment must not be more than 100 characters.';
        }
      },
    },
    async onSubmit(values) {
      const selected = zones.find(({ zone }) => zone.id === values.zoneId);
      if (!selected) {
        await showToast(Toast.Style.Failure, 'Choose a Cloudflare zone');
        return;
      }

      const toast = await showToast(
        Toast.Style.Animated,
        'Creating DNS Record',
        selected.zone.name,
      );
      try {
        await getCloudflareService().createDnsRecord(selected.zone.id, {
          type: values.type,
          name: normalizeDnsRecordName(values.name, selected.zone.name),
          content: normalizeDnsRecordContent(values.type, values.content),
          ttl: Number(values.ttl),
          proxied: isProxiableRecordType(values.type)
            ? values.proxied
            : undefined,
          priority: values.type === 'MX' ? Number(values.priority) : undefined,
          comment: values.comment.trim() || undefined,
        });
        toast.style = Toast.Style.Success;
        toast.title = 'Created DNS Record';
        toast.message = `${values.type} ${normalizeDnsRecordName(values.name, selected.zone.name)}`;
        reset({
          zoneId: values.zoneId,
          type: values.type,
          ttl: values.ttl,
          proxied: values.proxied,
          priority: values.priority,
        });
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
            icon={Icon.Plus}
            title="Create DNS Record"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Zone" {...itemProps.zoneId}>
        {zones.map(({ account, zone }) => (
          <Form.Dropdown.Item
            key={zone.id}
            title={`${zone.name} — ${account.name}`}
            value={zone.id}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Record Type" {...itemProps.type}>
        {DNS_RECORD_TYPES.map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Name"
        placeholder="@, www, or a fully-qualified name"
        {...itemProps.name}
      />
      {values.type === 'TXT' ? (
        <Form.TextArea title="Content" {...itemProps.content} />
      ) : (
        <Form.TextField title="Content" {...itemProps.content} />
      )}
      <Form.Dropdown title="TTL" {...itemProps.ttl}>
        {TTLS.map(([value, title]) => (
          <Form.Dropdown.Item key={value} title={title} value={value} />
        ))}
      </Form.Dropdown>
      {isProxiableRecordType(values.type) && (
        <Form.Checkbox
          label="Proxy traffic through Cloudflare"
          {...itemProps.proxied}
        />
      )}
      {values.type === 'MX' && (
        <Form.TextField title="Priority" {...itemProps.priority} />
      )}
      <Form.TextField
        title="Comment"
        placeholder="Optional"
        {...itemProps.comment}
      />
    </Form>
  );
}

export default withCloudflareAccessToken(Command);
