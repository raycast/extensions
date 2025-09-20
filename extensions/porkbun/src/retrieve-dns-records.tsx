import {
  ActionPanel,
  Action,
  Icon,
  Form,
  showToast,
  Toast,
  List,
  launchCommand,
  LaunchType,
  confirmAlert,
  Alert,
  LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  deleteRecordByDomainAndId,
  retrieveAllDomains,
  retrieveRecordsByDomainOrId,
  retrieveRecordsByDomainSubdomainAndType,
} from "./utils/api";
import { API_DOCS_URL, DNS_RECORD_TYPES } from "./utils/constants";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";
import { DNSRecordType, Domain, RetrieveAllDomainsResponse, RetrieveDNSRecordsResponse } from "./utils/types";

export default function RetrieveDNSRecord(props: LaunchProps<{ launchContext: { domain: string } }>) {
  type FormValues = {
    retrieve: string;
    domain: string;
    id: string;
    type: string;
    name: string;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [records, setRecords] = useState<RetrieveDNSRecordsResponse>();
  const [filteredRecords, setFilteredRecords] = useState<RetrieveDNSRecordsResponse>();
  const [domains, setDomains] = useCachedState<Domain[]>("domains");

  async function getDomainsFromApi() {
    setIsLoading(true);
    const response = (await retrieveAllDomains()) as RetrieveAllDomainsResponse;
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

  const navigationTitle = "Retrieve DNS Records";
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      let response;
      if (values.retrieve === "domainOrID") {
        response = await retrieveRecordsByDomainOrId(values.domain, Number(values.id));
      } else {
        response = await retrieveRecordsByDomainSubdomainAndType(
          values.domain,
          values.name,
          values.type as DNSRecordType,
        );
      }
      if (response?.status === "SUCCESS") {
        response = response as RetrieveDNSRecordsResponse;
        showToast({
          style: Toast.Style.Success,
          title: "SUCCESS!",
          message: `Fetched ${response.records.length} record${response.records.length !== 1 ? "s" : ""}`,
        });
        setRecords(response);
        setFilteredRecords(response);
      }
      setIsLoading(false);
    },
    validation: {
      domain: FormValidation.Required,
      id: (value) => {
        if (value && !Number(value)) {
          return "ID must be a number";
        }
      },
      type: (value) => {
        if (
          value &&
          itemProps.retrieve.value === "domainOrID" &&
          !DNS_RECORD_TYPES.some((record) => record.type === value)
        ) {
          return "Invalid item";
        }
      },
    },
    initialValues: {
      domain: props.launchContext?.domain,
    },
  });

  const description =
    itemProps.retrieve.value === "domainOrID"
      ? "Retrieve all editable DNS records associated with a domain or a single record for a particular record ID."
      : "Retrieve all editable DNS records associated with a domain, subdomain and type.";

  const deleteRecord = async (recordId: string) => {
    if (
      await confirmAlert({
        title: `Delete Record ${recordId}?`,
        message: "You will not be able to recover it.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteRecordByDomainAndId(itemProps.domain.value || "", Number(recordId));
      if (response.status === "SUCCESS") {
        showToast({
          style: Toast.Style.Success,
          title: "SUCCESS!",
          message: `Deleted Record ${recordId}`,
        });
        if (records) {
          const newRecords = records.records.filter((record) => record.id !== recordId);
          setRecords({
            cloudflare: records.cloudflare,
            status: records.status,
            records: newRecords,
          });
        }
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    function doFilter() {
      if (records) {
        const filtered = filter ? records.records.filter((record) => record.type === filter) : records.records;
        setFilteredRecords({
          cloudflare: records.cloudflare,
          status: records.status,
          records: filtered,
        });
      }
    }
    doFilter();
  }, [filter, records]);

  return !records ? (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Go to API Reference"
            url={`${API_DOCS_URL}DNS%20Retrieve%20Records%20by%20Domain%20or%20ID`}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.retrieve}>
        <Form.Dropdown.Item title="Retrieve by Domain or ID" value="domainOrID" />
        <Form.Dropdown.Item title="Retrieve by Domain, Subdomain and Type" value="domainSubdomainAndType" />
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
      {itemProps.retrieve.value === "domainOrID" && (
        <Form.TextField title="ID (optional)" placeholder="106926652" {...itemProps.id} />
      )}
      {itemProps.retrieve.value === "domainSubdomainAndType" && (
        <>
          <Form.Dropdown
            title="Type"
            info={`The type of record being retrieved. Valid types are: ${DNS_RECORD_TYPES.map(
              (record) => record.type,
            ).join(", ")}`}
            {...itemProps.type}
          >
            {DNS_RECORD_TYPES.map((record) => (
              <Form.Dropdown.Item
                value={record.type}
                title={`${record.type} - ${record.description}`}
                key={record.type}
              />
            ))}
          </Form.Dropdown>
          <Form.TextField title="Name (optional)" placeholder="_port._protocol (_100._tcp)" {...itemProps.name} />
          <Form.Description text={`.${itemProps.domain.value || "DOMAIN"}`} />
        </>
      )}
    </Form>
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Section title="Type">
            {DNS_RECORD_TYPES.map((record) => (
              <List.Dropdown.Item
                key={record.type}
                title={`${record.type} - ${record.description}`}
                value={record.type}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowLeft} title="Go Back" onAction={() => setRecords(undefined)} />
        </ActionPanel>
      }
      filtering
    >
      <List.Section title={`Cloudflare: ${records.cloudflare}`}>
        {filteredRecords &&
          filteredRecords.records.map((record) => (
            <List.Item
              key={record.id}
              title={record.id}
              accessories={[{ tag: record.type }]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.ArrowLeft} title="Go Back" onAction={() => setRecords(undefined)} />
                  <Action
                    icon={Icon.Pencil}
                    title="Edit Record"
                    onAction={() =>
                      launchCommand({
                        name: "edit-dns-record",
                        type: LaunchType.UserInitiated,
                        context: { domain: itemProps.domain.value, ...record },
                      })
                    }
                  />
                  <Action
                    icon={Icon.DeleteDocument}
                    title="Delete Record"
                    style={Action.Style.Destructive}
                    onAction={() => deleteRecord(record.id)}
                  />
                  <ActionPanel.Submenu title="Copy" icon={Icon.Clipboard}>
                    <Action.CopyToClipboard content={JSON.stringify(record)} title="All as JSON" />
                    <Action.CopyToClipboard content={record.id} title="ID" />
                    <Action.CopyToClipboard content={record.type} title="Type" />
                    <Action.CopyToClipboard content={record.name} title="Name" />
                    <Action.CopyToClipboard content={record.content} title="Content" />
                    <Action.CopyToClipboard content={record.notes || ""} title="Notes" />
                  </ActionPanel.Submenu>
                </ActionPanel>
              }
              icon={getFavicon(`https://${itemProps.domain.value}`)}
              detail={
                <List.Item.Detail
                  markdown={`
### Content
${record.content}

### Notes
${record.notes || "[NO NOTES]"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="id" text={record.id} />
                      <List.Item.Detail.Metadata.Label title="type" text={record.type} />
                      <List.Item.Detail.Metadata.Label title="name" text={record.name} />
                      <List.Item.Detail.Metadata.Label title="ttl" text={record.ttl} />
                      {record.prio ? (
                        <List.Item.Detail.Metadata.Label title="prio" text={record.prio} />
                      ) : (
                        <List.Item.Detail.Metadata.Label title="prio" icon={Icon.Minus} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
