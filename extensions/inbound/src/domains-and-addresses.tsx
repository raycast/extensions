import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useCachedPromise, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, parseInboundResponse } from "./inbound";
import { DomainWithStats, GetDomainsResponse } from "./types";
import { KeyObject } from "crypto";
import OpenInInbound from "./components/OpenInInbound";

const buildAccessories = (domain: DomainWithStats) => {
  const accessories: List.Item.Accessory[] = [];
  if (domain.status==="pending") accessories.push({tag: {value:"Inactive", color: Color.Red} })
  accessories.push({date: new Date(domain.updatedAt)})
return accessories;
}
export default function Command() {
  const {isLoading,data:domains,mutate} = useFetch(API_URL + "domains", {
    headers: API_HEADERS,
    parseResponse: parseInboundResponse,
    mapResult(result) {
      return {
        data: (result as GetDomainsResponse).data
      }
    },
    initialData: []
  })

const confirmAndDelete = (domain: DomainWithStats) => {
  confirmAlert({
    title: "Delete Domain",
    message: `This action cannot be undone. This will permanently delete the domain "${domain.domain}" and all associated email addresses and data.`,
    primaryAction: {
      style: Alert.ActionStyle.Destructive,
      title: "Delete Domain",
      async onAction() {
        const toast = await showToast(Toast.Style.Animated, "Deleting Domain", domain.domain);
            try {
              await mutate(
                fetch(API_URL + `domains/${domain.id}`, {
                  method: "DELETE",
                  headers: API_HEADERS
                }).then(parseInboundResponse), {
                  optimisticUpdate(data) {
                    return data.filter(d => d.id!==domain.id)
                  },
                  shouldRevalidateAfter: false
                }
              )
              toast.style = Toast.Style.Success;
              toast.title = "Deleted";
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Failed";
              toast.message = `${error}`;
            }
      },
    }
  })
}

 return <List isLoading={isLoading}>
  {!isLoading && !domains.length ? <List.EmptyView icon={Icon.Globe} title="No domains found" description="Start by adding a domain to create email addresses." actions={<ActionPanel>
    <Action.Push icon={Icon.PlusCircle} title="Add Your First Domain" target={<AddDomain />} onPop={mutate} />
  </ActionPanel>} /> : domains.map(domain => <List.Item key={domain.id} icon={getFavicon(`https://${domain.domain}`, {fallback: Icon.Globe})} title={domain.domain} subtitle={`API ID: ${domain.id}`} accessories={buildAccessories(domain)} actions={<ActionPanel>
    <Action.Push icon={Icon.Text} title="View DNS Records" target={<DNSRecords domain={domain} />} />
    <Action.Push icon={Icon.PlusCircle} title="Add Domain" target={<AddDomain />} onPop={mutate} />
    <Action icon={Icon.Trash} title="Delete Domain" onAction={() => confirmAndDelete(domain)} shortcut={Keyboard.Shortcut.Common.Remove} style={Action.Style.Destructive} />
  </ActionPanel>} />)}
 </List>
}

function AddDomain() {
  const {pop} = useNavigation();
  const {handleSubmit,itemProps} = useForm<{domain: string}>({
    async onSubmit(values) {
const toast = await showToast(Toast.Style.Animated, "Adding Domain", values.domain);
      try {
        const response = await fetch(API_URL + "domains", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            domain: values.domain
          })
        })
        await parseInboundResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
domain: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.PlusCircle} title="Add Domain" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.TextField title="Name" placeholder="example.com" {...itemProps.domain} />
  </Form>
}

function DNSRecords({domain}:{domain: DomainWithStats}) {
  const {isLoading, data: records} = useCachedPromise(async(domainId:string) => {
    const response = await fetch(API_URL + `domains/${domainId}/dns-records`, {
      headers: API_HEADERS
    })
    const result = await parseInboundResponse(response) as {records: Array<{id:string, "recordType": string,
      "name": string,
      "value": string}>};
      return result.records
  }, [domain.id], {initialData:[]})
  return <List isLoading={isLoading}>
    {!isLoading && !records.length ? <List.EmptyView title="No DNS records available yet." /> : records.map(record => <List.Item key={record.id} title={record.name===domain.domain ? "@" : record.name.replace(`.${domain.domain}`, "")} subtitle={record.value} accessories={[
      {tag: record.recordType}
    ]} actions={
      <ActionPanel>
        <OpenInInbound route={`emails/${domain.id}`} />
      </ActionPanel>
    } />)}
  </List>
}