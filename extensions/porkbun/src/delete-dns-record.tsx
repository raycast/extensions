import { ActionPanel, Action, Icon, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import { DNSRecordType, Domain } from "./utils/types";
import { deleteRecordByDomainAndId, deleteRecordByDomainSubdomainAndType, retrieveAllDomains } from "./utils/api";
import { API_DOCS_URL, DNS_RECORD_TYPES } from "./utils/constants";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";

export default function DeleteDNSRecord(props: LaunchProps<{ launchContext: { domain: string } }>) {
  type DeleteRecordFormValues = {
    domain: string;
    id: string;
    name: string;
    type: string;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [deleteType, setDeleteType] = useState("domainAndID");

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

  const navigationTitle = "Delete DNS Record";
  const { handleSubmit, itemProps } = useForm<DeleteRecordFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const { domain } = values;

      if (deleteType === "domainAndID") {
        const response = await deleteRecordByDomainAndId(domain, Number(values.id));
        if (response.status === "SUCCESS") {
          showToast({
            style: Toast.Style.Success,
            title: "SUCCESS",
            message: `Deleted Record with ID '${values.id}'`,
          });
        }
      } else {
        const name = values.name + values.domain;
        const response = await deleteRecordByDomainSubdomainAndType(domain, name, values.type as DNSRecordType);
        if (response.status === "SUCCESS") {
          showToast({
            style: Toast.Style.Success,
            title: "SUCCESS",
            message: `Deleted Record(s)`,
          });
        }
      }
      setIsLoading(false);
    },
    validation: {
      domain: FormValidation.Required,
      id: (value) => {
        if (deleteType === "domainAndID") {
          if (!value) {
            return "The item is required";
          } else if (!Number(value)) {
            return "ID must be a number";
          }
        }
      },
      type: (value) => {
        if (deleteType !== "domainAndID") {
          if (!value) {
            return "The item is required";
          } else if (!DNS_RECORD_TYPES.some((record) => record.type === value)) {
            return "Invalid item";
          }
        }
      },
    },
    initialValues: {
      domain: props.launchContext?.domain,
    },
  });

  const description =
    deleteType === "domainAndID"
      ? "Delete a specific DNS record."
      : "Delete all records for the domain that match a particular subdomain and type.";

  const documentationUrl = () => {
    const base = `${API_DOCS_URL}DNS%20Delete%20Record`;
    if (deleteType === "domainAndID") {
      return base + "%20by%20Domain%20and%20ID";
    } else {
      return base + "s%20by%20Domain,%20Subdomain%20and%20Type";
    }
  };
  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action.OpenInBrowser icon={Icon.Globe} title="Go to API Reference" url={documentationUrl()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown id="deleteType" value={deleteType} onChange={setDeleteType}>
        <Form.Dropdown.Item title="Delete by Domain and ID" value="domainAndID" />
        <Form.Dropdown.Item title="Delete by Domain, Subdomain and Type" value="domainSubdomainAndType" />
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
      {deleteType === "domainAndID" && <Form.TextField title="ID" placeholder="Enter id" {...itemProps.id} />}

      {deleteType !== "domainAndID" && (
        <Fragment>
          <Form.Dropdown
            title="Type"
            info={`The type of record being deleted. Valid types are: ${DNS_RECORD_TYPES.map(
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
          <Form.TextField
            title="Name"
            placeholder="_port._protocol (_100._tcp)"
            info="The subdomain for the record being deleted, not including the domain itself. Leave blank to delete a record on the root domain. Use * to delete a wildcard record."
            {...itemProps.name}
          />
          <Form.Description text={`.${itemProps.domain.value || "DOMAIN"}`} />
        </Fragment>
      )}
    </Form>
  );
}
