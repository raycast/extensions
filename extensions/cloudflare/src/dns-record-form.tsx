import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api';
import { FormValidation, useForm } from '@raycast/utils';
import { getCloudflareService } from './oauth';
import { DnsRecord } from './service';
import { handleNetworkError } from './utils';

interface FormValues {
  name: string;
  content: string;
  ttl: string;
  comment: string;
}

interface EditDnsRecordViewProps {
  zoneId: string;
  record: DnsRecord;
  onSave: () => void;
}

interface DuplicateDnsRecordViewProps {
  zoneId: string;
  record: DnsRecord;
  onCreate: () => void;
}

const EDITABLE_RECORD_TYPES = new Set([
  'A',
  'AAAA',
  'CAA',
  'CNAME',
  'MX',
  'NS',
  'PTR',
  'TXT',
]);

export function canEditDnsRecord(record: DnsRecord): boolean {
  return EDITABLE_RECORD_TYPES.has(record.type);
}

export function EditDnsRecordView({
  zoneId,
  record,
  onSave,
}: EditDnsRecordViewProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: record.name,
      content: record.content,
      ttl: String(record.ttl),
      comment: record.comment ?? '',
    },
    validation: {
      name: FormValidation.Required,
      content: FormValidation.Required,
      ttl(value) {
        const ttl = Number(value);
        if (!Number.isInteger(ttl) || (ttl !== 1 && ttl < 30)) {
          return 'Use 1 for automatic TTL or a whole number of at least 30 seconds.';
        }
      },
      comment(value) {
        if (value && value.length > 100) {
          return 'Comment must not be more than 100 characters.';
        }
      },
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: 'Updating DNS Record',
      });
      try {
        await getCloudflareService().updateDnsRecord(zoneId, record.id, {
          name: values.name.trim(),
          content: values.content.trim(),
          ttl: Number(values.ttl),
          comment: values.comment.trim() || null,
        });
        toast.style = Toast.Style.Success;
        toast.title = 'Updated DNS Record';
        onSave();
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
            icon={Icon.Pencil}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Update DNS Record"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Type" text={record.type} />
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextArea title="Content" {...itemProps.content} />
      <Form.TextField
        title="TTL"
        info="Use 1 for automatic TTL, or enter the TTL in seconds."
        {...itemProps.ttl}
      />
      <Form.TextField
        title="Comment"
        placeholder="Optional comment"
        {...itemProps.comment}
      />
    </Form>
  );
}

export function DuplicateDnsRecordView({
  zoneId,
  record,
  onCreate,
}: DuplicateDnsRecordViewProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: record.name,
      content: record.content,
      ttl: String(record.ttl),
      comment: record.comment ?? '',
    },
    validation: {
      name: FormValidation.Required,
      content: FormValidation.Required,
      ttl(value) {
        const ttl = Number(value);
        if (!Number.isInteger(ttl) || (ttl !== 1 && ttl < 30)) {
          return 'Use 1 for automatic TTL or a whole number of at least 30 seconds.';
        }
      },
      comment(value) {
        if (value && value.length > 100) {
          return 'Comment must not be more than 100 characters.';
        }
      },
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: 'Creating DNS Record',
      });
      try {
        await getCloudflareService().createDnsRecord(zoneId, {
          type: record.type,
          name: values.name.trim(),
          content: values.content.trim(),
          ttl: Number(values.ttl),
          comment: values.comment.trim() || null,
          proxied: record.proxied,
          tags: record.tags,
          priority: record.priority,
          data: record.data,
          settings: record.settings,
        });
        toast.style = Toast.Style.Success;
        toast.title = 'Created DNS Record';
        onCreate();
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
            icon={Icon.Duplicate}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Create DNS Record"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Duplicate Record"
        text={`Create another ${record.type} record using these values.`}
      />
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextArea title="Content" {...itemProps.content} />
      <Form.TextField
        title="TTL"
        info="Use 1 for automatic TTL, or enter the TTL in seconds."
        {...itemProps.ttl}
      />
      <Form.TextField
        title="Comment"
        placeholder="Optional comment"
        {...itemProps.comment}
      />
    </Form>
  );
}
