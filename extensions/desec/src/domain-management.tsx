import { Action, ActionPanel, Alert, confirmAlert, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";

interface Domain {
  created: string;
  published: string;
  name: string
  minimum_ttl: number
  touched: string
}

export default function DomainManagement() {
  const {token} = getPreferenceValues<Preferences>();
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
    {!isLoading && !error && !domains?.length ? <List.EmptyView title="Feels so empty here!" description="No entries yet." /> : domains?.map(domain => <List.Item key={domain.name} icon={getFavicon(`https://${domain.name}`)} title={domain.name} accessories={[{date: new Date(domain.published)}]} actions={<ActionPanel>
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
