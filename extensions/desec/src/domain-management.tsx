import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Detail, Form, getPreferenceValues, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getAvatarIcon, getFavicon, useFetch, useForm } from "@raycast/utils";

interface Domain {
  created: string;
  published: string;
  name: string
  minimum_ttl: number
  touched: string
}
interface RRset {
  created: string
  domain: string
  subname: string
  name: string
  records: string[]
  ttl:number
  type:string
  touched:string

}

const {token} = getPreferenceValues<Preferences>();

export default function DomainManagement() {
  const {isLoading, data: domains, error,mutate} = useFetch<Domain[]>("https://desec.io/api/v1/domains/", {
    headers: {
      Authorization: `Token ${token}`
    }
  })

  const deleteDomain = async (domainName: string) => {
    const response = await fetch(`https://desec.io/api/v1/domains/${domainName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${token}`
      }
    })
    if (!response.ok) throw new Error(response.statusText);
  } 
  
  return <List isLoading={isLoading}>
    {!isLoading && !error && !domains?.length ? <List.EmptyView title="Feels so empty here!" description="No entries yet." actions={<ActionPanel>
      <Action.Push icon={Icon.PlusCircle} title="Create New Domain" target={<CreateNewDomain />} onPop={mutate} />
    </ActionPanel>} /> : domains?.map(domain => <List.Item key={domain.name} icon={getFavicon(`https://${domain.name}`)} title={domain.name} accessories={[{date: new Date(domain.published)}]} actions={<ActionPanel>
      <Action.Push icon={Icon.List} title="View Record Sets" target={<ViewRecordSets domain={domain} />} />
      <Action icon={Icon.CopyClipboard} title="Copy Zonefile" onAction={async() => {
        const toast = await showToast(Toast.Style.Animated, "Copying Zonefile", domain.name)
        try {
          const response = await fetch(`https://desec.io/api/v1/domains/${domain.name}/zonefile`, {
             headers: {
              Authorization: `Token ${token}`
            }
          })
          if (!response.ok) throw new Error(response.statusText);
              const result = await response.text();
              await Clipboard.copy(result);
              toast.style = Toast.Style.Success;
              toast.title = "Copied"
        } catch (error) {
          toast.style = Toast.Style.Failure
          toast.title = `${error}`
        }
      }} />
      <Action icon={Icon.Trash} title="Delete" style={Action.Style.Destructive} onAction={() => confirmAlert({
        icon: Icon.Info,
        title: `Delete ${domain.name}`,
        message: "This operation will cause the domain to disappear from the DNS. It will no longer be reachable from the Internet.",
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Delete",
          async onAction() {
            const toast = await showToast(Toast.Style.Animated, "Deleting", domain.name);
            try {
              await mutate(deleteDomain(domain.name), {
                optimisticUpdate(data) {
                  return (data || []).filter(d => d.name !==domain.name)
                },
                shouldRevalidateAfter: false
              })
              toast.style = Toast.Style.Success;
              toast.title = "Deleted"
            } catch (error) {
              toast.style=Toast.Style.Failure;
              toast.title = `${error}`;
            }

          },
        }
      })} />
    </ActionPanel>} />)}
  </List>
}

function CreateNewDomain() {
  const {pop} = useNavigation()
  const {handleSubmit,itemProps} = useForm<{name: string}>({
    async onSubmit(values) {
      const {name} = values;
      const toast = await showToast(Toast.Style.Animated, "Creating", name);
            try {
              const response = await fetch(`https://desec.io/api/v1/domains/`, {
                   method: "POST",
                   headers: {
                     Authorization: `Token ${token}`,
                     "Content-Type": "application/json"
                   },
                   body: JSON.stringify({name})
                 })
                 if (!response.ok) {
                   const result = await response.json() as {[field:string]: string | string[]};
                   const first = Object.values(result)[0];
                   const error = Array.isArray(first) ? first[0] : first;
                   throw new Error(error)
                 }

              toast.style = Toast.Style.Success;
              toast.title = "Created"
pop()
            } catch (error) {
              toast.style=Toast.Style.Failure;
              toast.title = `${error}`;
            }
            
    },
    validation: {
      name: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
      <Action.SubmitForm icon={Icon.SaveDocument} title="Save" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.TextField title="Domain" placeholder="Enter Domain Name" {...itemProps.name} />
  </Form>
}

function ViewRecordSets({domain}: {domain: Domain}) {
 const {isLoading, data: records, error,mutate} = useFetch<RRset[]>(`https://desec.io/api/v1/domains/${domain.name}/rrsets`, {
    headers: {
      Authorization: `Token ${token}`
    }
  }) 
  return <List isLoading={isLoading} navigationTitle={`Domain Management / ${domain.name}`} isShowingDetail>
{records?.map((record,index) => <List.Item key={index} icon={getAvatarIcon(record.type)} title={record.type} detail={<List.Item.Detail  markdown={record.records.join("\n\n")} metadata={<List.Item.Detail.Metadata>
  <List.Item.Detail.Metadata.Label title="Subname" text={record.subname || "(Optional)"} />
  <List.Item.Detail.Metadata.Label title="TTL" text={record.ttl.toString()} />
</List.Item.Detail.Metadata>} />} />)}
  </List>
}