import { ActionPanel, Action, Icon, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { DNSRecordType, Domain } from "./utils/types";
import { createRecord, retrieveAllDomains } from "./utils/api";
import { API_DOCS_URL, DNS_RECORD_TYPES, MINIMUM_TTL } from "./utils/constants";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";

export default function CreateDNSRecord(props: LaunchProps<{ launchContext: { domain: string } }>) {
  interface FormValues {
    domain: string;
    name: string;
    type: string;
    content: string;
    ttl?: string;
    prio?: string;
  }

  const [isLoading, setIsLoading] = useState(false);

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

  const navigationTitle = "Create DNS Record";
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const { domain, name, type, content, ttl, prio } = values;

      const response = await createRecord(domain, { name, type: type as DNSRecordType, content, ttl, prio });
      if (response.status === "SUCCESS") {
        showToast({
          style: Toast.Style.Success,
          title: "SUCCESS!",
          message: `Created Record ${response.id?.toString()}`,
        });
      }
      setIsLoading(false);
    },
    validation: {
      domain: FormValidation.Required,
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
      prio: (value) => {
        if (value && DNS_RECORD_TYPES.some((record) => record.type === itemProps.type.value && record.hasPriority)) {
          if (!Number(value) && value !== "0") {
            return "The item must be a number";
          }
        }
      },
    },
    initialValues: {
      domain: props.launchContext?.domain,
      ttl: MINIMUM_TTL.toString(),
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title="Go to API Reference"
              url={`${API_DOCS_URL}DNS%20Create%20Record`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
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
      <Form.Separator />
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
        title="Name"
        placeholder="_port._protocol (_100._tcp)"
        info="The subdomain for the record being created, not including the domain itself. Leave blank to create a record on the root domain. Use * to create a wildcard record."
        {...itemProps.name}
      />
      <Form.Description text={`.${itemProps.domain.value || "DOMAIN"}`} />
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
        info="The time to live in seconds for the record. The minimum and the default is 600 seconds."
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
