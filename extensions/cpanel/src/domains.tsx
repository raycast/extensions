import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getAvatarIcon, getFavicon, useCachedState, useForm } from "@raycast/utils";
import { useListDomains, useParsedDNSZone, useUAPI } from "./lib/hooks";
import { DEFAULT_ICON } from "./lib/constants";
import { DNSZoneRecord } from "./lib/types";
import { useMemo, useState } from "react";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";
import { deleteDNSZoneRecord } from "./lib/api";

export default function Domains() {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { isLoading, data } = useListDomains();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {data && (
        <>
          <List.Section title="Main Domain">
            <Domain domain={data.main_domain} />
          </List.Section>
          <List.Section title="Addon Domains">
            {data.addon_domains.map((domain) => (
              <Domain key={domain} domain={domain} />
            ))}
          </List.Section>
          <List.Section title="Sub Domains">
            {data.sub_domains.map((domain) => (
              <Domain key={domain} domain={domain} showAction={false} />
            ))}
          </List.Section>
          <List.Section title="Parked Domains">
            {data.parked_domains.map((domain) => (
              <Domain key={domain} domain={domain} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function Domain({ domain, showAction = true }: { domain: string; showAction?: boolean }) {
  return (
    <List.Item
      title={domain}
      icon={getFavicon(`https://${domain}`, { fallback: DEFAULT_ICON })}
      actions={
        showAction && (
          <ActionPanel>
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.Push icon={Icon.Eye} title="View DNS Zone" target={<ViewDNSZone zone={domain} />} />
          </ActionPanel>
        )
      }
    />
  );
}

type SOARecord = DNSZoneRecord & { type: "record"; dname: string; data: string[] };

function ViewDNSZone({ zone }: { zone: string }) {
  const { isLoading, data = [], revalidate } = useParsedDNSZone(zone);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-dns-zone-details", false);

  const [type, setType] = useState("");
  const recordsToShow = useMemo(
    //filter out the record types cPanel does not show. We do not do this in hook as the records are still needed for other operations
    () => data.filter((record) => record.record_type !== "SOA" && record.record_type !== "NS"),
    [data],
  );
  const filteredRecords = useMemo(
    () => recordsToShow.filter((record) => !type || record.record_type === type),
    [recordsToShow, type],
  );

  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchBarPlaceholder="Search dns zone"
      searchBarAccessory={
        <List.Dropdown tooltip="Record Type" onChange={setType}>
          <Form.Dropdown.Item icon={Icon.Dot} title={`All (${recordsToShow.length})`} value="" />
          <Form.Dropdown.Section>
            {[...new Set(recordsToShow.map((record) => record.record_type))].map((type) => (
              <List.Dropdown.Item
                key={type}
                icon={getAvatarIcon(type)}
                title={`${type} (${recordsToShow.filter((record) => record.record_type === type).length})`}
                value={type}
              />
            ))}
          </Form.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`Domains / ${zone} / DNS Zone`} subtitle={`${filteredRecords.length} records`}>
        {filteredRecords.map((zoneItem) => {
          let markdown = "";
          switch (zoneItem.record_type) {
            case "MX":
              markdown = `**Priority**: ${zoneItem.data[0]}\n\n`;
              markdown += `**Destination**: ${zoneItem.data[1]}\n\n`;
              break;
            case "SRV":
              markdown = `**Priority**: ${zoneItem.data[0]}\n\n`;
              markdown += `**Weight**: ${zoneItem.data[1]}\n\n`;
              markdown += `**Port**: ${zoneItem.data[2]}\n\n`;
              markdown += `**Target**: ${zoneItem.data[3]}\n\n`;
              break;
            default:
              markdown = zoneItem.data.join(`\n\n`);
              break;
          }
          return (
            <List.Item
              key={zoneItem.line_index}
              title={zoneItem.dname}
              accessories={[{ tag: zoneItem.record_type }]}
              detail={<List.Item.Detail markdown={markdown} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Plus}
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Create DNS Zone Record"
                    target={
                      <CreateDNSZoneRecord
                        zone={zone}
                        soa={data.find((record) => record.record_type === "SOA") as SOARecord}
                        onRecordCreated={revalidate}
                      />
                    }
                  />
                  <Action
                    icon={Icon.AppWindowSidebarLeft}
                    title="Toggle Details"
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />
                  <Action
                    icon={Icon.Trash}
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Delete DNS Zone Record"
                    onAction={() =>
                      confirmAlert({
                        icon: { source: Icon.Trash, tintColor: Color.Red },
                        title: `Delete ${zoneItem.record_type} record for ${zoneItem.dname}?`,
                        message: zoneItem.line_index.toString(),
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete",
                          onAction() {
                            const soa = data.find((record) => record.record_type === "SOA") as SOARecord;
                            deleteDNSZoneRecord(soa.data[2], zone, zoneItem.line_index).then(revalidate);
                          },
                        },
                      })
                    }
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CreateDNSZoneRecord({
  zone,
  soa,
  onRecordCreated,
}: {
  zone: string;
  soa: SOARecord;
  onRecordCreated: () => void;
}) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  type FormValues = {
    dname: string;
    ttl: string;
    record_type: string;
    data: string;
  };

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      ttl: "14400",
    },
    validation: {
      dname: FormValidation.Required,
      ttl(value) {
        if (!value) return "The item is required";
        if (!Number(value)) return "The item must be a number";
      },
      data: FormValidation.Required,
    },
  });

  const { isLoading } = useUAPI(
    "DNS",
    "mass_edit_zone",
    {
      serial: soa.data[2],
      zone,
      add: JSON.stringify({ ...values, data: [values.data] }),
    },
    {
      execute,
      onError() {
        setExecute(false);
      },
      async onData() {
        await showToast({
          title: `Created ${values.record_type} record successfully`,
        });
        onRecordCreated();
        pop();
      },
    },
  );

  const DNS_RECORD_TYPES = {
    A: "IPv4 address",
    AAAA: "IPv6 address",
    CNAME: "Fully qualified domain name",
    TXT: "Text",
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Record" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Domains / ${zone} / DNS Zone / Create Record`} />
      <Form.TextField title="Name" placeholder="Valid zone name" {...itemProps.dname} />
      <Form.TextField title="TTL" placeholder="Time in seconds" {...itemProps.ttl} />
      <Form.Dropdown title="Type" {...itemProps.record_type}>
        {Object.keys(DNS_RECORD_TYPES).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Record"
        placeholder={DNS_RECORD_TYPES[values.record_type as keyof typeof DNS_RECORD_TYPES]}
        {...itemProps.data}
      />
    </Form>
  );
}
