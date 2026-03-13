import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from '@raycast/api';
import { FormValidation, useForm } from '@raycast/utils';
import { useState } from 'react';
import { CreateDNSRecord, Domain } from '../../utils/interfaces';
import api from '../../utils/api';
import { handleNetworkError } from '../../utils/helpers';
import { DNS_RECORD_TYPES } from '../../utils/constants';

interface CreateDNSRecordComponentProps {
  domain: Domain;
  onDNSRecordCreated: () => void;
}
export default function CreateDNSRecordComponent({
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
        await showToast({
          title: `Creating ${values.type} record`,
          style: Toast.Style.Animated,
        });
        await api.createDNSRecord(domain.id, body);
        await showToast({
          title: `${type} record created`,
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
          return 'Different hostname is required';
      },
      flag(value) {
        if (values.type === 'CAA') {
          if (!value) return 'The item is required';
          else if (!Number(value)) return 'The item must be a number';
          else if (Number(value) < 0 || Number(value) > 255)
            return 'The item must be between 0 and 255';
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
        info={`@ will automatically set ${domain.name} as the host name`}
        {...itemProps.hostname}
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
              placeholder="Priority"
              info="The priority of the target host, lower value means more preferred"
              {...itemProps.priority}
            />
          )}
          {values.type === 'CAA' && (
            <>
              <Form.TextField
                title="Flag"
                placeholder="0 to 255"
                {...itemProps.flag}
              />
              <Form.TextField
                title="Tag"
                placeholder="issue, issuewild, issuemail, iodef"
                info="The identifier of the property represented by the record. Options: issue, issuewild or iodef"
                {...itemProps.tag}
              />
            </>
          )}
          {['CAA', 'SPF', 'TXT'].includes(values.type) ? (
            <Form.TextArea
              title="Value"
              placeholder="Value"
              {...itemProps.value}
            />
          ) : (
            <Form.TextField
              title="Value"
              placeholder="Value"
              {...itemProps.value}
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
            info="The symbolic name of the desired service; this is usually sip"
            placeholder="sip"
            {...itemProps.service}
          />
          <Form.TextField
            title="Protocol"
            info="The transport protocol of the desired service; this is usually either TCP or UDP"
            placeholder="tcp, udp"
            {...itemProps.protocol}
          />
          <Form.TextField
            title="Priority"
            placeholder="Priority"
            info="The priority of the target host, lower value means more preferred"
            {...itemProps.priority}
          />
          <Form.TextField
            title="Weight"
            info="A relative weight for records with the same priority, higher value means more preferred"
            {...itemProps.weight}
          />
          <Form.TextField
            title="Port"
            info="The TCP or UDP port on which the service is found"
            {...itemProps.port}
          />
          <Form.TextField
            title="Target"
            info="The TCP or UDP port on which the service is found"
            {...itemProps.value}
          />
        </>
      )}
      <Form.TextField
        title="TTL"
        placeholder="TTL in seconds (optional)"
        info="The amount of time the record is allowed to be cached by a resolver"
        {...itemProps.ttl}
      />
    </Form>
  );
}
