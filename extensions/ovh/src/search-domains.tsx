import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getAvatarIcon, getFavicon, useCachedPromise, useForm} from "@raycast/utils";
import { DNSRecord, Domain } from "./types";
import { callOvh } from "./ovh";

function generateDomainAccessories(domain: Domain) {
  const accessories: List.Item.Accessory[] = [];
  switch (domain.transferLockStatus) {
    case "locked":
      accessories.push({icon: {source: Icon.Lock, tintColor: Color.Green}, tooltip: "This domain is transfer-protected"})
      break;
    default:
      break;
  }
  switch (domain.dnssecState) {
    case "disabled":
      accessories.push({icon: Icon.Shield, tooltip: "Dnssec is disabled"})
      break;
      case "enabled":
      accessories.push({icon: {source: Icon.Shield, tintColor: Color.Green}, tooltip: "Dnssec is disabled"})
      break;
    default:
      break;
  }
  switch (domain.renewalState) {
    case "automatic_renew":
      accessories.push({tag: {value:"Automatic renewal", color: Color.Green}, tooltip: `Before ${new Date(domain.renewalDate).getMonth()+1}/${new Date(domain.renewalDate).getFullYear()}`})
      break;
  
    default:
      break;
  }
  return accessories;
}

export default function SearchDomains() {
  const {isLoading, data:domains, revalidate}= useCachedPromise(async()=>{
    const list = await callOvh<string[]>("v1/domain");
    const domains = await Promise.all(list.map(domain => callOvh<Domain>(`v1/domain/${domain}`)));
    return domains;
  }, [], {
    initialData: []
  })
  return <List isLoading={isLoading}>
    {domains.map(domain => <List.Item key={domain.serviceId} icon={getFavicon(`https://${domain.domain}`, {fallback: Icon.Globe})} title={domain.domain} accessories={generateDomainAccessories(domain)} actions={<ActionPanel>
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      <Action.Push icon={Icon.Text} title="DNS Records" target={<DNSRecords domain={domain} />} />
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      <Action.Push icon={Icon.Network} title="Modify DNS Servers" target={<ModifyDNSServers domain={domain} />} onPop={revalidate} />
    </ActionPanel>} />)}
  </List>
}

function DNSRecords({domain}:{domain: Domain}) {
  const {isLoading, data:records}= useCachedPromise(async()=>{
    const list = await callOvh<string[]>(`v1/domain/zone/${domain.domain}/record`);
    const records = await Promise.all(list.map(record => callOvh<DNSRecord>(`v1/domain/zone/${domain.domain}/record/${record}`)));
    return records;
  }, [], {
    initialData: []
  })
  return <List isLoading={isLoading} isShowingDetail>
    {records.map(record => <List.Item key={record.id} icon={getAvatarIcon(record.fieldType)} title={record.zone} accessories={[{tag: record.fieldType}]} detail={<List.Item.Detail markdown={record.target} />} />)}
  </List>
}

function ModifyDNSServers({domain}:{domain: Domain}) {
  const {pop} = useNavigation()
  type FormValues = {
    ns1: string;
    ns2: string;
    ns3: string;
    ns4: string;
  }
  const {handleSubmit, itemProps} = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Modifying");
      try {
        await callOvh(`v1/domain/${domain.domain}/nameServers/update`, {
          method: "POST",
          body: {
            nameServers: Object.values(values).filter(host => !!host).map(host => ({host}))
          }
        })
        toast.style = Toast.Style.Success;
        toast.title ="Modified"
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      ns1: domain.nameServers[0]?.nameServer,
      ns2: domain.nameServers[1]?.nameServer,
      ns3: domain.nameServers[2]?.nameServer,
      ns4: domain.nameServers[3]?.nameServer
    },
    validation: {
      ns1: FormValidation.Required,
      ns2: FormValidation.Required,
    }
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Network} title="Apply Configuration" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.TextField title="DNS server 1" {...itemProps.ns1} />
  <Form.TextField title="DNS server 2" {...itemProps.ns2} />
  <Form.TextField title="DNS server 3" {...itemProps.ns3} />
  <Form.TextField title="DNS server 4" {...itemProps.ns4} />
  </Form>
}