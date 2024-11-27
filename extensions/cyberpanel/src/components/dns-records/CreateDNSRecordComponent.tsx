import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { CreateDNSRecordFormValues, CreateDNSRecordRequest } from "../../types/dns-records";
import { createDNSRecord } from "../../utils/api";
import { DNS_RECORD_TYPES } from "../../utils/constants";

type CreateDNSRecordProps = {
  initialSelectedZone: string;
  onDNSRecordCreated: () => void;
};
export default function CreateDNSRecord({ initialSelectedZone, onDNSRecordCreated }: CreateDNSRecordProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateDNSRecordFormValues>({
    async onSubmit(values) {
      const body: CreateDNSRecordRequest = {
        ...values,
        ttl: Number(values.ttl),
        priority: "priority" in values ? Number(values.priority) : undefined,
      };
      if (!body.priority) delete body.priority;

      const response = await createDNSRecord(body);
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Created DNS Record successfully`);
        onDNSRecordCreated();
        pop();
      }
    },
    initialValues: {
      selectedZone: initialSelectedZone,
    },
    validation: {
      selectedZone: FormValidation.Required,
      recordName(value) {
        if (DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value && record.hasName))
          if (!value) return "The item is required";
      },
      ttl(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
        else if (Number(value) < 1) return "The item must be greater than 0";
        else if (Number(value) > 86400) return "The item must be < 86400";
      },
      recordType: FormValidation.Required,
      priority(value) {
        if (DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value && record.hasPriority))
          if (!value) return "The item is required";
          else if (!Number(value) && value !== "0") return "The item must be a number";
          else if (Number(value) < 0) return "The item must be greater than -1";
      },
    },
  });
  return (
    <Form
      navigationTitle="Create DNS Record"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Zone" placeholder="example.local" {...itemProps.selectedZone} />
      <Form.Dropdown title="Record Type" {...itemProps.recordType}>
        {DNS_RECORD_TYPES.map((record) => (
          <Form.Dropdown.Item key={record.type} title={record.type} value={record.type} />
        ))}
      </Form.Dropdown>

      {DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value && record.hasName) && (
        <Form.TextField title="Record Name" placeholder="" {...itemProps.recordName} />
      )}
      <Form.TextField title="TTL" placeholder="60" {...itemProps.ttl} />
      {DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value && record.hasPriority) && (
        <Form.TextField title="Priority" placeholder="10" {...itemProps.priority} />
      )}

      {itemProps.recordType.value === "A" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentA}
        />
      )}
      {itemProps.recordType.value === "AAAA" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentAAAA}
        />
      )}
      {itemProps.recordType.value === "CNAME" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentCNAME}
        />
      )}
      {itemProps.recordType.value === "MX" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentMX}
        />
      )}
      {itemProps.recordType.value === "TXT" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentTXT}
        />
      )}
      {itemProps.recordType.value === "SPF" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentSPF}
        />
      )}
      {itemProps.recordType.value === "NS" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentNS}
        />
      )}
      {itemProps.recordType.value === "SOA" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentSOA}
        />
      )}
      {itemProps.recordType.value === "SRV" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentSRV}
        />
      )}
      {itemProps.recordType.value === "CAA" && (
        <Form.TextArea
          title="Content"
          placeholder={
            DNS_RECORD_TYPES.find((record) => record.type === itemProps.recordType.value)?.contentPlaceholder
          }
          {...itemProps.recordContentCAA}
        />
      )}
    </Form>
  );
}
