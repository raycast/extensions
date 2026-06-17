import { ActionPanel, Action, Icon, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { DNSRecord, DNSRecordType, Domain } from "./utils/types";
import { editRecordByDomainAndId, editRecordByDomainSubdomainAndType, retrieveAllDomains } from "./utils/api";
import { API_DOCS_URL, DNS_RECORD_TYPES, MINIMUM_TTL } from "./utils/constants";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";

type EditRecordProps = {
  domain: string;
} & DNSRecord;
export default function EditDNSRecord(props: LaunchProps<{ launchContext: EditRecordProps }>) {
  interface FormValues {
    id: string;
    domain: string;
    name: string;
    type: string;
    content: string;
    ttl?: string;
    prio?: string;
  }

  const propDomain = props.launchContext?.domain;
  const propName = props.launchContext?.name;

  const initialName = propDomain && propName ? propName.slice(0, -propDomain.length - 1) : "";

  const [isLoading, setIsLoading] = useState(false);
  const [edit, setEdit] = useState("domainAndID");

  const [domains, setDomains] = useCachedState<Domain[]>("domains");
  async function getDomainsFromApi() {
    setIsLoading(true);
    const response = await retrieveAllDomains();
    if (response.status === "SUCCESS") {
      setDomains(response.domains);
      showToast({
        style: Toast.Style.Success,
        title: "SUCCESS",
        message: `Fetched ${response.domains.length} domains`,
      });
    }
    setIsLoading(false);
  }
  useEffect(() => {
    if (!domains) getDomainsFromApi();
  }, []);

  const navigationTitle = "Edit DNS Record";
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const { domain, name, type, content, ttl, prio } = values;

      if (edit === "domainAndID") {
        const response = await editRecordByDomainAndId(domain, Number(values.id), {
          name,
          type: type as DNSRecordType,
          content,
          ttl,
          prio,
        });
        if (response.status === "SUCCESS") {
          showToast({
            style: Toast.Style.Success,
            title: "SUCCESS",
            message: `Edited Record with ID '${values.id}'`,
          });
        }
      } else {
        const response = await editRecordByDomainSubdomainAndType(domain, name, type as DNSRecordType, {
          content,
          ttl,
          prio,
        });
        if (response.status === "SUCCESS") {
          showToast({
            style: Toast.Style.Success,
            title: "SUCCESS",
            message: `Edited Record`,
          });
        }
      }
      setIsLoading(false);
    },
    validation: {
      domain: FormValidation.Required,
      id: (value) => {
        if (edit === "domainAndID") {
          if (!value) {
            return "The item is required";
          } else if (!Number(value)) {
            return "ID must be a number";
          }
        }
      },
      type: (value) => {
        if (!value) {
          return "The item is required";
        } else if (!DNS_RECORD_TYPES.some((record) => record.type === value)) {
          return "Invalid item";
        }
      },
      content: FormValidation.Required,
      ttl: (value) => {
        if (value) {
          if (Number(value)) {
            if (Number(value) < MINIMUM_TTL) return `Minimum TTL is ${MINIMUM_TTL}`;
          } else {
            return "TTL must be a number";
          }
        } else {
          return "The item is required";
        }
      },
    },
    initialValues: {
      domain: propDomain || "",
      id: props.launchContext?.id || "",
      name: initialName,
      type: (props.launchContext?.type as string) || DNS_RECORD_TYPES[0].type,
      content: props.launchContext?.content || "",
      ttl: props.launchContext?.ttl || MINIMUM_TTL.toString(),
      prio: props.launchContext?.prio || "",
    },
  });

  const description =
    edit === "domainAndID"
      ? "Edit a DNS record."
      : "Edit all records for the domain that match a particular subdomain and type.";

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Go to API Reference"
            url={`${API_DOCS_URL}DNS%20Edit%20Record%20by%20Domain%20and%20ID`}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="edit" value={edit} onChange={setEdit}>
        <Form.Dropdown.Item title="Edit by Domain and ID" value="domainAndID" />
        <Form.Dropdown.Item title="Edit by Domain, Subdomain and Type" value="domainSubdomainAndType" />
      </Form.Dropdown>
      <Form.Description text={description} />
      <Form.Separator />

      <Form.Dropdown title="Domain" {...itemProps.domain}>
        {domains?.map((item) => (
          <Form.Dropdown.Item
            key={item.domain}
            title={item.domain}
            value={item.domain}
            icon={getFavicon(`https://${item.domain}`)}
          />
        ))}
      </Form.Dropdown>
      {edit === "domainAndID" && <Form.TextField title="ID" placeholder="Enter id" {...itemProps.id} />}
      {edit === "domainAndID" && <Form.Separator />}
      <Form.Dropdown
        title="Type"
        info={`The type of record being created. Valid types are: ${DNS_RECORD_TYPES.map((record) => record.type).join(
          ", ",
        )}`}
        {...itemProps.type}
      >
        {DNS_RECORD_TYPES.map((record) => (
          <Form.Dropdown.Item value={record.type} title={`${record.type} - ${record.description}`} key={record.type} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Name (optional)"
        placeholder="_port._protocol (_100._tcp)"
        info="The subdomain for the record being created, not including the domain itself. Leave blank to create a record on the root domain. Use * to create a wildcard record."
        {...itemProps.name}
      />
      <Form.Description text={`.${itemProps.domain.value}`} />
      {edit !== "domainAndID" && <Form.Separator />}
      {itemProps.type.value !== "TXT" ? (
        <Form.TextField
          title="Content"
          placeholder="Enter content"
          info="The answer content for the record. Please see the DNS management popup from the domain management console for proper formatting of each record type."
          {...itemProps.content}
        />
      ) : (
        <Form.TextArea
          title="Content"
          placeholder="Enter content"
          info="The answer content for the record. Please see the DNS management popup from the domain management console for proper formatting of each record type."
          {...itemProps.content}
        />
      )}
      <Form.TextField
        title="TTL"
        placeholder="Enter TTL"
        info={`The time to live in seconds for the record. The minimum and the default is ${MINIMUM_TTL} seconds.`}
        {...itemProps.ttl}
      />
      {DNS_RECORD_TYPES.some((record) => record.type === itemProps.type.value && record.hasPriority) && (
        <Form.TextField
          title="Priority"
          placeholder="Enter priority"
          info="The priority of the record for those that support it."
          {...itemProps.prio}
        />
      )}
    </Form>
  );
}
