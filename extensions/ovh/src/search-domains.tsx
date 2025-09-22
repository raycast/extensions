import { Detail, getPreferenceValues } from "@raycast/api";
import { useCachedPromise} from "@raycast/utils";
import crypto from 'crypto';

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
    if (!response.ok) throw new Error((result as Error).message);
    return result as T;
}

export default function Command() {
  const {isLoading, data}= useCachedPromise(async()=>{
    const result = await callOvh({endpoint:"v1/domain"});
    console.log(result);
  })
  return <Detail isLoading={isLoading} markdown={JSON.stringify(data)} />;
}
