import { Action, ActionPanel, Color, Form, getPreferenceValues, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";

const { email, api_key } = getPreferenceValues<Preferences>();
const TOKEN = Buffer.from(`${email}:${api_key}`).toString('base64');
const API_URL = "https://api.upstash.com/v2/"
const API_HEADERS = {
  Authorization: `Basic ${TOKEN}`
}
interface RedisDatabase {
  database_id: string;
  database_name: string;
  endpoint: string;
  pinned?: true;
}
interface RedisDatabaseStats {
  daily_net_commands: number;
  daily_read_requests: number;
  daily_write_requests: number;
  // dailyproduce: null,
  // dailyconsume: null,
  total_monthly_bandwidth: number;
  total_monthly_requests: number;
  total_monthly_read_requests: number;
  total_monthly_write_requests: number;
  total_monthly_script_requests: number;
  queue_optimized: boolean;
  total_monthly_storage: number;
  current_storage: number;
  total_monthly_billing: number;
  // total_monthly_produce: null,
  // total_monthly_consume: null,
}

function OpenInUpstash({route}: {route: string}) {
  return <Action.OpenInBrowser icon="upstash-icon-dark-bg.png" title="Open in Upstash" url={`https://console.upstash.com/${route}`} />
}
async function callUpstash(endpoint: string, body: Record<string, string>) {
  const response = await fetch(API_URL + endpoint, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let result;
  try {
    result = await JSON.parse(text);
  } catch {
    result = text;
  }
  if (!response.ok) throw new Error(result || response.statusText);
  return result;
}

export default function Redis() {
  const {isLoading, data: databases, error, mutate} = useFetch<RedisDatabase[], RedisDatabase[]>(API_URL + "redis/databases", {
    headers: API_HEADERS,
    initialData: []
  })

  return <List isLoading={isLoading}>
    {!isLoading && !databases.length && !error ? <List.EmptyView icon="empty-image.svg" title="Create a Redis Database" description="We manage the database for you and you only pay for what you use." actions={<ActionPanel>
      <Action.Push icon={Icon.Plus} title="Create Database" target={<CreateDatabase mutate={mutate} />} />
    </ActionPanel>} /> : databases.map(database => <List.Item key={database.database_id} icon="redis.svg" title={database.database_name} subtitle={database.endpoint.split(".")[0]} accessories={[
      {...database.pinned && {icon: Icon.Star}}
    ]} actions={<ActionPanel>
      <Action.Push title="View Details" target={<ViewDetails database={database} />} />
      <OpenInUpstash route={`redis/${database.database_id}`} />
    </ActionPanel>} />)}
  </List>
}

function CreateDatabase({mutate}: {mutate: MutatePromise<RedisDatabase[]>}) {
  const {pop} = useNavigation();
  const PRIMARY_REGIONS = {
    "us-east-1": "N. Virginia, USA",
    "us-west-1": "N. California, USA",
    "us-west-2": "Oregon, USA",
    "eu-central-1": "Frankfurt, Germany",
    "eu-west-1": "Ireland",
    "sa-east-1": "Sao Paulo, Brazil",
    "ap-southeast-1": "Singapore",
    "ap-southeast-2": "Sydney, Australia",
  }
  interface FormValues {
    name: string;
    primary_region: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await mutate(
          callUpstash("redis/database", {
            name: values.name,
            region: "global",
            primary_region: values.primary_region,
          })
        )
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      primary_region: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.Description text="Only Free Databases" />
    <Form.TextField title="Name" {...itemProps.name} />
    <Form.Dropdown title="Primary Region" info="Choose the region where most of your writes will take place." {...itemProps.primary_region}>
      <Form.Dropdown.Section title="Amazon Web Services">
        {Object.entries(PRIMARY_REGIONS).map(([key, val]) => <Form.Dropdown.Item key={key} title={`${val} (${key})`} value={key} />)}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  </Form>
}

function ViewDetails({database}: {database: RedisDatabase}) {
  const {isLoading: isLoadingDetails} = useFetch<RedisDatabase>(API_URL + `redis/database/${database.database_id}`, {
    headers: API_HEADERS
  });
  const {isLoading: isLoadingStats, data: stats} = useFetch<RedisDatabaseStats>(API_URL + `redis/stats/${database.database_id}`, {
    headers: API_HEADERS
  });

  return <List isLoading={isLoadingStats || isLoadingDetails} isShowingDetail>
    {stats && <List.Item title="Details" detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Commands" text={`${stats.total_monthly_requests} / 500k per month`} />
      <List.Item.Detail.Metadata.Label icon={{source:Icon.Dot, tintColor: Color.Green}} title="" text={`Writes...${stats.total_monthly_write_requests}`} />
      <List.Item.Detail.Metadata.Label icon={{source:Icon.Dot, tintColor: Color.Blue}} title="" text={`Reads...${stats.total_monthly_read_requests}`} />
      {/* <List.Item.Detail.Metadata.Label title="Bandwidth" text={`${stats.daily_net_commands} / 500k per month`} /> */}
    </List.Item.Detail.Metadata>} />} />}
  </List>
}