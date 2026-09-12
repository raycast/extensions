import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchProps,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { deleteDNSRecord, listDNSRecordsInDomain } from "./utils/api";
import { useEffect, useState } from "react";
import ErrorComponent from "./components/ErrorComponent";
import { DNSRecord, ListDNSRecordsInDomainResponse } from "./types/dns-records";
import CreateDNSRecord from "./components/dns-records/CreateDNSRecordComponent";

export default function ListDNSRecordsInDomain(props: LaunchProps<{ arguments: Arguments.ListDnsRecordsInDomain }>) {
  const { selectedZone, currentSelection } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [dnsRecords, setDNSRecords] = useState<DNSRecord[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listDNSRecordsInDomain({
      selectedZone,
      currentSelection: currentSelection.toLowerCase() + "Record",
    });
    if (response.error_message === "None") {
      const successResponse = response as ListDNSRecordsInDomainResponse;
      const data = typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} DNS Records`);
      setDNSRecords(data);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(id: number) {
    if (
      await confirmAlert({
        title: `Delete DNS Record with id '${id}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteDNSRecord({ id });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted DNS Record successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title={`zone: ${selectedZone} | type: ${currentSelection}`}>
        {dnsRecords &&
          dnsRecords.map((dnsRecord) => (
            <List.Item
              key={dnsRecord.id}
              title={dnsRecord.id.toString()}
              icon={Icon.Document}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="ID" text={dnsRecord.id.toString()} />
                      <List.Item.Detail.Metadata.Label title="Type" text={dnsRecord.type} />
                      <List.Item.Detail.Metadata.Label title="Name" text={dnsRecord.name} />
                      <List.Item.Detail.Metadata.Label title="Content" text={dnsRecord.content} />
                      <List.Item.Detail.Metadata.Label title="Priority" text={dnsRecord.priority.toString()} />
                      <List.Item.Detail.Metadata.Label title="TTL" text={dnsRecord.ttl.toString()} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(dnsRecord)} />
                  <ActionPanel.Section>
                    <Action
                      title="Delete DNS Record"
                      icon={Icon.DeleteDocument}
                      onAction={() => confirmAndDelete(dnsRecord.id)}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel.Section>
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
                  target={<CreateDNSRecord initialSelectedZone={selectedZone} onDNSRecordCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
