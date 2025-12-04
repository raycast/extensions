import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useFetch, useForm } from "@raycast/utils";
import { DNSRecord, Domain, ErrorResult } from "./types";

const {api_token} = getPreferenceValues<Preferences>();
const API_URL = "https://api.alwaysdata.com/v1";
const buildApiUrl = (endpoint: string, params?: { [key: string]: string | number }) => `${API_URL}/${endpoint}/${params ? `?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join("&")}` : ""}`;
const headers = {
  "Accept-Language": "en",
  Authorization: `Basic ${Buffer.from(`${api_token}:`).toString("base64")}`
};
const parseResponse = async <T,>(response: Response) => {
  if (response.status===201) return undefined as T;
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error(typeof err==="string" ? err : Object.values(err).flat().join(", "));
  }
  return result as T;
}
export default function Domains() {
  const {isLoading, data: domains, mutate} = useFetch(buildApiUrl("domain"), {
    headers,
    parseResponse: parseResponse<Domain[]>,
    initialData: []
  })

  return <List isLoading={isLoading}>
    <List.EmptyView title="No domain name" actions={<ActionPanel>
      <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={mutate} />
    </ActionPanel>} />
    {domains.map(domain => <List.Item key={domain.id} icon={getFavicon(domain.name, {fallback: Icon.Globe})} title={domain.name} actions={<ActionPanel>
      <Action.Push title="DNS Records" target={<DNSRecords domainId={domain.id} />} />
      <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={mutate} />
    </ActionPanel>} />)}
  </List>
}

function AddDomain() {
  const {pop} = useNavigation();
  const {handleSubmit,itemProps} = useForm<{name: string}>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name)
      try {
        const response = await fetch(buildApiUrl("domain"), {
          method: "POST",
          headers,
          body: JSON.stringify(values)
        })
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop()
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed"
        toast.message = `${error}`
      }
    },
    validation: {
      name: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
<Action.SubmitForm icon={Icon.Plus} title="Add Domain" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.TextField title="Domain" placeholder="example.com" {...itemProps.name} />
  </Form>
}

function DNSRecords({domainId}: {domainId: number}) {
  const {isLoading, data: records} = useFetch(buildApiUrl("record", {
    domain: domainId
  }), {
    headers,
    parseResponse: parseResponse<DNSRecord[]>,
    initialData: []
  })

  return <List isLoading={isLoading}>
    {records.map(record => <List.Item key={record.id} title={record.type} />)}
  </List>
}
