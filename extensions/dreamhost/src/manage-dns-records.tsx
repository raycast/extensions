import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useFetch, useForm } from "@raycast/utils";

interface DNSRecord {
  record: string;
  type: string;
  account_id: string;
  comment: string;
  zone: string;
  editable: string;
  value: string;
}
interface SuccessResult<T> {
  result: "success";
  data: T;
}
interface ErrorResult {
  result: "error";
  data: string;
  reason?: string;
}

const { api_key } = getPreferenceValues<Preferences>();
const buildApiUrl = ({ cmd, params }: { cmd: string; params: Record<string, string> }) => {
  const url = new URL("https://api.dreamhost.com/");
  url.searchParams.set("key", api_key);
  url.searchParams.set("format", "json");
  url.searchParams.set("cmd", cmd);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};
const parseApiResponse = async <T,>(response: Response) => {
  const txt = await response.text();
  const result: ErrorResult | SuccessResult<T> = await JSON.parse(txt);
  if (result.result === "error") throw new Error(result.reason || result.data);
  return result.data;
};
export default function ManageDNSRecords() {
  const {
    isLoading,
    data: records,
    mutate,
  } = useFetch(buildApiUrl({ cmd: "dns-list_records", params: {} }), {
    parseResponse: parseApiResponse<DNSRecord[]>,
    initialData: [],
  });

  const grouped = records.reduce(
    (acc, item) => {
      if (!acc[item.zone]) acc[item.zone] = [];
      acc[item.zone].push(item);
      return acc;
    },
    {} as { [zone: string]: DNSRecord[] },
  );

  return (
    <List isLoading={isLoading}>
      {Object.keys(grouped).map((zone) => (
        <List.Section key={zone} title={zone}>
          {grouped[zone].map((record, index) => (
            <List.Item
              key={index}
              icon={getFavicon(`https://${record.zone}`)}
              title={record.record === record.zone ? "@" : record.record.split(".")[0]}
              subtitle={record.zone}
              accessories={[{ text: record.value }, { tag: record.type }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Record"
                    target={<AddRecord zones={Object.keys(grouped)} />}
                    onPop={mutate}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Record"
                    onAction={() =>
                      confirmAlert({
                        icon: { source: Icon.Info, tintColor: Color.Red },
                        title: "Are you sure you want to remove this record?",
                        message: "You can't undo this.",
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Remove",
                          async onAction() {
                            const toast = await showToast(Toast.Style.Animated, "Removing");
                            try {
                              const result: "record_removed" = await mutate(
                                fetch(
                                  buildApiUrl({
                                    cmd: "dns-remove_record",
                                    params: { record: record.record, type: record.type, value: record.value },
                                  }),
                                ).then(parseApiResponse),
                                {
                                  optimisticUpdate(data) {
                                    return data.filter(
                                      (r) =>
                                        !(
                                          r.record === record.record &&
                                          r.type === record.type &&
                                          r.zone === record.zone &&
                                          r.value === record.value
                                        ),
                                    );
                                  },
                                },
                              );
                              toast.style = Toast.Style.Success;
                              toast.title = "Removed";
                              toast.message = result;
                            } catch (error) {
                              toast.style = Toast.Style.Failure;
                              toast.title = "Failed";
                              toast.message = `${error}`;
                            }
                          },
                        },
                      })
                    }
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const TYPES: { [type: string]: string } = {
  A: "A (Address) records are IPv4 addresses. They can be added to point a domain name to a different hosting company, or different subdomains of a site to external services. To create a custom A record for the root domain, leave the Host field blank; an @ symbol is added automatically.",
  AAAA: "AAAA records are IPv6 addresses. Similar to A records, they are used to point a domain or subdomain to a hosting service. AAAA records are less common than A records, since most internet traffic runs over IPv4. To create a custom AAAA record for the root domain, leave the Host field blank; an @ symbol is added automatically.",
  TXT: "TXT (Text) records are free-form strings that allow an administrator to associate text with a domain or subdomain. TXT records are commonly used for Google site verification, or for adding SPF, DMARC, and DKIM signing for mail services.",
};
function AddRecord({ zones }: { zones: string[] }) {
  interface FormValues {
    host: string;
    zone: string;
    type: string;
    value: string;
    comment: string;
  }
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.type);
      try {
        const host = values.host === "@" ? "" : values.host;
        const record = [host, values.zone].filter(Boolean).join(".");
        const response = await fetch(
          buildApiUrl({
            cmd: "dns-add_record",
            params: {
              record,
              type: values.type,
              value: values.value,
              comment: values.comment,
            },
          }),
        );
        const result = await parseApiResponse<"record_added">(response);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        toast.message = result;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      value: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Record" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Host" placeholder="@" {...itemProps.host} />
      <Form.Dropdown title="Zone" {...itemProps.zone}>
        {zones.map((zone) => (
          <Form.Dropdown.Item
            key={zone}
            icon={getFavicon(`https://${zone}`, { fallback: Icon.Globe })}
            title={zone}
            value={zone}
          />
        ))}
      </Form.Dropdown>
      <Form.Description title="" text={`${(values.host || "@") === "@" ? "" : values.host + "."}${values.zone}`} />
      <Form.Dropdown title="Type" info={TYPES[values.type]} {...itemProps.type}>
        {Object.keys(TYPES).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Value"
        placeholder={values.type === "TXT" ? "TXT Value" : "Points to"}
        {...itemProps.value}
      />
      <Form.TextArea title="Comment" info="Optional comment for this record" {...itemProps.comment} />
    </Form>
  );
}
