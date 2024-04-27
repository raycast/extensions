import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from '@raycast/api';
import { FormValidation, useForm, usePromise } from '@raycast/utils';
import api from '../utils/api';
import { DNS_RECORD_TYPES } from '../utils/constants';
import { CreateDNSRecord, DNSRecord, Domain } from '../utils/interfaces';
import { useState } from 'react';
import { handleNetworkError } from '../utils/helpers';

interface Props {
  domain: Domain;
}
export default function ManageDNSRecords({ domain }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmAndDeleteRecord(record: DNSRecord) {
    const options: Alert.Options = {
      icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
      title: `Delete DNS record?`,
      message: `Are you sure you want to delete this ${record.type} record? \n\n ${record.hostname} = ${record.value}`,
      primaryAction: {
        title: 'Delete',
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          try {
            setIsDeleting(true);
            await showToast({
              title: `Deleting ${record.type} record`,
              style: Toast.Style.Animated,
            });
            await api.deleteDNSRecord(domain.id, record.id);
            await showToast({
              title: `Deleted ${record.type} record`,
            });
            revalidate();
          } catch (e) {
            handleNetworkError(e);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    };
    await confirmAlert(options);
  }

  const {
    data: records,
    isLoading: isFetching,
    revalidate,
  } = usePromise(async () => await api.getDNSRecords(domain.id), [], {
    async onWillExecute() {
      await showToast({
        title: `Fetching DNS Records for ${domain.name}`,
        style: Toast.Style.Animated,
      });
    },
    async onData(data) {
      await showToast({
        title: `Fetched ${data.length} DNS Records for ${domain.name}`,
      });
    },
  });

  const isLoading = isFetching || isDeleting;

  return (
    <List
      navigationTitle={`Domains / ${domain.name} / Manage DNS Records`}
      isLoading={isLoading}
    >
      <List.Section title={domain.name}>
        {records?.map((record) => (
          <List.Item
            key={record.id}
            title={record.hostname}
            subtitle={record.value}
            accessories={[
              { text: record.ttl.toString() },
              { tag: record.type },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={`Delete ${record.type} Record`}
                  style={Action.Style.Destructive}
                  icon={Icon.DeleteDocument}
                  onAction={() => confirmAndDeleteRecord(record)}
                />
                <Action.Push
                  title="Create DNS Record"
                  icon={Icon.Plus}
                  target={
                    <CreateDNSRecordComponent
                      domain={domain}
                      onDNSRecordCreated={revalidate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create DNS Record"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create DNS Record"
                  icon={Icon.Plus}
                  target={
                    <CreateDNSRecordComponent
                      domain={domain}
                      onDNSRecordCreated={revalidate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

interface CreateDNSRecordComponentProps {
  domain: Domain;
  onDNSRecordCreated: () => void;
}
function CreateDNSRecordComponent({
  domain,
  onDNSRecordCreated,
}: CreateDNSRecordComponentProps) {
  interface FormValues {
    type: string;
    hostname: string;
    flag: string;
    tag: string;
    value: string;
    ttl: string;
    priority: string;
    weight: string;
    port: string;
    service?: string;
    protocol?: string;
  }

  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      const { type } = values;

      const srvHostname =
        type === 'SRV' ? `_${values.service}._${values.protocol}` : '';
      const endHostname = values.hostname === '@' ? '' : values.hostname;
      const hostname = srvHostname + (endHostname ? `.${endHostname}` : '');

      const body: CreateDNSRecord = {
        type,
        hostname,
        value: values.value,
        ttl: !values.ttl ? null : Number(values.ttl),
        priority: values.priority ? Number(values.priority) : null,
        weight: values.weight ? Number(values.weight) : null,
        port: values.port ? Number(values.port) : null,
        flag: values.flag ? Number(values.flag) : null,
        tag: values.flag || null,
      };
      try {
        await api.createDNSRecord(domain.id, body);
        await showToast({
          title: `${type} Record Created`,
        });
        onDNSRecordCreated();
        pop();
      } catch (e) {
        handleNetworkError(e);
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      hostname: '@',
    },
    validation: {
      type: FormValidation.Required,
      hostname(value) {
        if (!value) return 'The item is required';
        else if (values.type === 'CNAME' && value === '@')
          return 'Differenet hostname is required';
      },
      flag(value) {
        if (values.type === 'CAA') {
          if (!value) return 'The item is required';
          else if (!Number(value)) return 'The item must be a number';
        }
      },
      tag(value) {
        if (values.type === 'CAA') {
          if (!value) return 'The item is required';
        }
      },
      value: FormValidation.Required,
      ttl(value) {
        if (value) if (!Number(value)) return 'The item must be a number';
      },
      priority(value) {
        if (values.type === 'MX' || values.type === 'SRV') {
          if (!value) return 'The item is required';
          else if (!Number(value)) return 'The item must be a number';
        }
      },
      port(value) {
        if (values.type === 'SRV') {
          if (!value) return 'The item is required';
          else if (!Number(value)) return 'The item must be a number';
        }
      },
      service(value) {
        if (values.type === 'SRV') {
          if (!value) return 'The item is required';
        }
      },
      protocol(value) {
        if (values.type === 'SRV') {
          if (!value) return 'The item is required';
        }
      },
      weight(value) {
        if (values.type === 'SRV') {
          if (!value) return 'The item is required';
          else if (!Number(value)) return 'The item must be a number';
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={`Domains / ${domain.name} / Create DNS Record`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Record"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain.name} />
      <Form.Dropdown title="Record type" {...itemProps.type}>
        {Object.keys(DNS_RECORD_TYPES).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Name"
        {...itemProps.hostname}
        info={`@ will automatically set ${domain.name} as the host name`}
      />
      {values.type !== 'SRV' ? (
        <>
          <Form.Description
            text={
              values.type === 'CNAME'
                ? `A subdomain, like www or ftp - we automatically append ${domain.name}`
                : `@ will automatically set ${domain.name} as the host name`
            }
          />
          {values.type === 'MX' && (
            <Form.TextField
              title="Priority"
              {...itemProps.priority}
              placeholder="Priority"
              info="The priority of the target host, lower value means more preferred"
            />
          )}
          {values.type === 'CAA' && (
            <>
              <Form.TextField title="Flag" {...itemProps.flag} />
              <Form.TextField
                title="Tag"
                {...itemProps.tag}
                info="The identifier of the property represented by the record. Options: issue, issuewild or iodef"
              />
            </>
          )}
          {['CAA', 'SPF', 'TXT'].includes(values.type) ? (
            <Form.TextArea
              title="Value"
              {...itemProps.value}
              placeholder="Value"
            />
          ) : (
            <Form.TextField
              title="Value"
              {...itemProps.value}
              placeholder="Value"
            />
          )}
          {values.type && (
            <Form.Description
              text={
                DNS_RECORD_TYPES[values.type as keyof typeof DNS_RECORD_TYPES]
              }
            />
          )}
        </>
      ) : (
        <>
          <Form.TextField
            title="Service"
            {...itemProps.service}
            info="The symbolic name of the desired service; this is usually sip"
          />
          <Form.TextField
            title="Protocol"
            {...itemProps.protocol}
            info="The transport protocol of the desired service; this is usually either TCP or UDP"
          />
          <Form.TextField
            title="Priority"
            {...itemProps.priority}
            placeholder="Priority"
            info="The priority of the target host, lower value means more preferred"
          />
          <Form.TextField
            title="Weight"
            {...itemProps.weight}
            info="A relative weight for records with the same priority, higher value means more preferred"
          />
          <Form.TextField
            title="Port"
            {...itemProps.port}
            info="The TCP or UDP port on which the service is found"
          />
          <Form.TextField
            title="Target"
            {...itemProps.value}
            info="The TCP or UDP port on which the service is found"
          />
        </>
      )}
      <Form.TextField
        title="TTL"
        {...itemProps.ttl}
        placeholder="TTL in seconds (optional)"
        info="The amount of time the record is allowed to be cached by a resolver"
      />
    </Form>
  );
}
