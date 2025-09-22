import { Detail, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise} from "@raycast/utils";
import crypto from 'crypto';

type DomainState = "autorenew_in_progress"
|"autorenew_registry_in_progress"
|"deleted"
|"dispute"
|"expired"
|"ok"
|"outgoing_transfer"
|"pending_create"
|"pending_delete"
|"pending_incoming_transfer"
|"pending_installation"
|"registry_suspended"
|"restorable"
|"technical_suspended"
type Domain = {
  domain: string
  serviceId: number;
  state: DomainState;
}

const preferences = getPreferenceValues<Preferences>();
async function callOvh<T>({method="GET", endpoint, body}: {method?: string, endpoint: string; body?: Record<string,string>}) {
  const responseTimestamp = await fetch("https://api.ovh.com/1.0/auth/time");
  if (!responseTimestamp.ok) throw new Error(responseTimestamp.statusText);
  const timestamp = await responseTimestamp.text();
  const url = new URL(endpoint, `https://${preferences.ovh_endpoint}`);
  const query = url.toString();
  
  const hashData = [
      preferences.application_secret,
      preferences.consumer_key,
      method,
      query,
      body ? JSON.stringify(body) : "",
      timestamp
    ]
    const hash = crypto.createHash('sha1').update(hashData.join("+")).digest('hex');
    const signature = `$1$${hash}`;

    const response = await fetch(query, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Ovh-Signature": signature,
        "X-Ovh-Timestamp": timestamp,
        "X-Ovh-Application": preferences.application_key,
        "X-Ovh-Consumer": preferences.consumer_key
      }
    });
    const result = await response.json();
    // console.log(result);
    if (!response.ok) throw new Error((result as Error).message);
    // console.log(result);
    return result as T;
}

export default function Command() {
  const {isLoading, data:domains}= useCachedPromise(async()=>{
    const resultDomainList = await callOvh<string[]>({endpoint:"v1/domain"});
    const resultDomains = await Promise.all(resultDomainList.map(domain => callOvh<Domain>({endpoint: `v1/domain/${domain}`})));
    return resultDomains;
  }, [], {
    initialData: []
  })
  return <List isLoading={isLoading}>
    {domains.map(domain => <List.Item key={domain.domain} icon={getFavicon(`https://${domain.domain}`, {fallback: Icon.Globe})} title={domain.domain} />)}
  </List>
}
