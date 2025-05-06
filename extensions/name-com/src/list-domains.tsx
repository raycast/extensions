import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { API_URL, headers, parseResponse } from "./api";
import { DNSRecord, Domain, type DomainDetails } from "./types";
import { useState } from "react";

export default function ListDomains() {
  const { isLoading, data } = useFetch(API_URL + "domains", {
    headers,
    parseResponse,
    mapResult(result: { domains?: Domain[] }) {
      return {
        data: result.domains ?? [],
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain names">
      {!data.length && !isLoading && (
        <List.EmptyView
          title="You have no domains. Start your domain search."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={getFavicon("https://www.name.com/")}
                title="Search on Name.com"
                url="https://www.name.com/"
              />
            </ActionPanel>
          }
        />
      )}
      {data.map((d) => (
        <List.Item
          key={d.domainName}
          icon={getFavicon(`https://${d.domainName}`)}
          title={d.domainName}
          accessories={[
            { icon: d.locked ? Icon.Lock : Icon.LockUnlocked, tooltip: d.locked ? "Locked" : "Unlocked" },
            { date: new Date(d.expireDate), tooltip: `Expires: ${d.expireDate}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Eye} title="View Details" target={<DomainDetails domainName={d.domainName} />} />
              <Action.Push
                icon={Icon.Text}
                title="View DNS Records"
                target={<DNSRecords domainName={d.domainName} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DomainDetails({ domainName }: { domainName: string }) {
  const { isLoading, data } = useFetch<DomainDetails>(API_URL + "domains/" + domainName, {
    headers,
    parseResponse,
  });

  const markdown = domainName + (!data ? "" : `\n\n ## Nameservers \n\n ${data.nameservers.join(`\n\n`)}`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Locked" icon={data.locked ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label title="Autorenew" icon={data.locked ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label title="Renewal Price" text={data.renewalPrice.toString()} />
            <Detail.Metadata.Label title="Create Data" text={data.createDate} />
            <Detail.Metadata.Label title="Expire Data" text={data.expireDate} />
          </Detail.Metadata>
        )
      }
    />
  );
}

function DNSRecords({ domainName }: { domainName: string }) {
  const { isLoading, data, mutate } = useFetch(API_URL + `domains/${domainName}/records`, {
    headers,
    parseResponse,
    mapResult(result: { records?: DNSRecord[] }) {
      return {
        data: result.records ?? [],
      };
    },
    initialData: [],
  });

  async function deleteDNSRecord(recordId: number) {
    const options: Alert.Options = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Delete DNS Record",
      rememberUserChoice: true,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting DNS Record");
      try {
        await mutate(
          fetch(API_URL + `domains/${domainName}/records/${recordId}`, {
            method: "DELETE",
            headers,
          }).then(parseResponse),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Deleted DNS Record";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${error}`;
        toast.message = `${(error as Error).cause ?? ""}`;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {!data.length && !isLoading && (
        <List.EmptyView
          description="No Results"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create DNS Record"
                target={<CreateDNSRecord domainName={domainName} mutate={mutate} />}
              />
            </ActionPanel>
          }
        />
      )}
      {data.map((record) => (
        <List.Item
          key={record.id}
          icon={Icon.Dot}
          title={record.host ?? ""}
          subtitle={record.domainName}
          accessories={[{ tag: record.type }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create DNS Record"
                target={<CreateDNSRecord domainName={domainName} mutate={mutate} />}
              />
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Delete DNS Record"
                  onAction={() => deleteDNSRecord(record.id)}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateDNSRecord({ domainName, mutate }: { domainName: string; mutate: MutatePromise<DNSRecord[]> }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  type FormValues = {
    host: string;
    type: string;
    answer: string;
    ttl: string;
    priority: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating DNS Record");
      try {
        setIsLoading(true);
        await mutate(
          fetch(API_URL + `domains/${domainName}/records`, {
            method: "POST",
            headers,
            body: JSON.stringify(values),
          }).then(parseResponse),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Created DNS Record";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${error}`;
        toast.message = `${(error as Error).cause ?? ""}`;
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      answer: FormValidation.Required,
      priority(value) {
        if (values.type === "MX" || values.type === "SRV") {
          if (!value) return "The item is required";
          if (!Number.isFinite(value)) return "The item must be a number";
        }
      },
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domainName} />
      <Form.TextField
        title="Host"
        placeholder="@"
        info="Host is the hostname relative to the zone"
        {...itemProps.host}
      />
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="A" value="A" />
        <Form.Dropdown.Item title="AAAA" value="AAAA" />
        <Form.Dropdown.Item title="ANAME" value="ANAME" />
        <Form.Dropdown.Item title="CNAME" value="CNAME" />
        <Form.Dropdown.Item title="MX" value="MX" />
        <Form.Dropdown.Item title="NS" value="NS" />
        <Form.Dropdown.Item title="SRV" value="SRV" />
        <Form.Dropdown.Item title="TXT" value="TXT" />
      </Form.Dropdown>
      <Form.TextField title="Answer" placeholder="IP, target, text" {...itemProps.answer} />
      <Form.Separator />
      <Form.Dropdown title="TTL" {...itemProps.ttl}>
        <Form.Dropdown.Item title="5 minutes" value="300" />
        <Form.Dropdown.Item title="10 minutes" value="600" />
        <Form.Dropdown.Item title="30 minutes" value="1800" />
        <Form.Dropdown.Item title="45 minutes" value="2700" />
        <Form.Dropdown.Item title="1 hour" value="3600" />
      </Form.Dropdown>
      {(values.type === "MX" || values.type === "SRV") && (
        <Form.TextField title="Priority" placeholder="10" {...itemProps.priority} />
      )}
    </Form>
  );
}
