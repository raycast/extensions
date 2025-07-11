import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, OpenInUpstash, postUpstash } from "./upstash";

interface RedisDatabase {
  database_id: string;
  database_name: string;
  database_type: string;
  endpoint: string;
  pinned?: true;
}
interface RedisDatabaseDetails extends RedisDatabase {
  port: number;
  tls: boolean;
}
interface RedisDatabaseStats {
  total_monthly_bandwidth: number;
  total_monthly_requests: number;
  total_monthly_read_requests: number;
  total_monthly_write_requests: number;
  total_monthly_storage: number;
  total_monthly_billing: number;
}

export default function Redis() {
  const {
    isLoading,
    data: databases,
    error,
    mutate,
  } = useFetch<RedisDatabase[], RedisDatabase[]>(API_URL + "redis/databases", {
    headers: API_HEADERS,
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {!isLoading && !databases.length && !error ? (
        <List.EmptyView
          icon="empty-image.svg"
          title="Create a Redis Database"
          description="We manage the database for you and you only pay for what you use."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Database" target={<CreateDatabase mutate={mutate} />} />
            </ActionPanel>
          }
        />
      ) : (
        databases.map((database) => (
          <List.Item
            key={database.database_id}
            icon="redis.svg"
            title={database.database_name}
            subtitle={database.endpoint.split(".")[0]}
            accessories={[{ ...(database.pinned && { icon: Icon.Star }) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Details & Usage"
                  target={<ViewDetailsAndUsage database={database} />}
                />
                <Action.Push icon={Icon.Plus} title="Create Database" target={<CreateDatabase mutate={mutate} />} />
                <OpenInUpstash route={`redis/${database.database_id}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateDatabase({ mutate }: { mutate: MutatePromise<RedisDatabase[]> }) {
  const { pop } = useNavigation();
  const PRIMARY_REGIONS = {
    "us-east-1": "N. Virginia, USA",
    "us-west-1": "N. California, USA",
    "us-west-2": "Oregon, USA",
    "eu-central-1": "Frankfurt, Germany",
    "eu-west-1": "Ireland",
    "sa-east-1": "Sao Paulo, Brazil",
    "ap-southeast-1": "Singapore",
    "ap-southeast-2": "Sydney, Australia",
  };
  interface FormValues {
    name: string;
    primary_region: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await mutate(
          postUpstash("redis/database", {
            name: values.name,
            region: "global",
            primary_region: values.primary_region,
          }),
        );
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
      primary_region: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Only Free Databases" />
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Dropdown
        title="Primary Region"
        info="Choose the region where most of your writes will take place."
        {...itemProps.primary_region}
      >
        <Form.Dropdown.Section title="Amazon Web Services">
          {Object.entries(PRIMARY_REGIONS).map(([key, val]) => (
            <Form.Dropdown.Item key={key} title={`${val} (${key})`} value={key} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}

function ViewDetailsAndUsage({ database }: { database: RedisDatabase }) {
  const { isLoading: isLoadingDetails, data: details } = useFetch<RedisDatabaseDetails>(
    API_URL + `redis/database/${database.database_id}`,
    {
      headers: API_HEADERS,
    },
  );
  const { isLoading: isLoadingStats, data: stats } = useFetch<RedisDatabaseStats>(
    API_URL + `redis/stats/${database.database_id}`,
    {
      headers: API_HEADERS,
    },
  );

  return (
    <List isLoading={isLoadingStats || isLoadingDetails} isShowingDetail>
      {details && stats && (
        <>
          <List.Item
            title="Details"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Endpoint" text={details.endpoint} />
                    <List.Item.Detail.Metadata.Label title="Port" text={`${details.port}`} />
                    <List.Item.Detail.Metadata.Label title="TLS/SSL" text={details.tls ? "Enabled" : "Disabled"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
          <List.Item
            title="Usage"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Commands"
                      text={`${stats.total_monthly_requests} / ${details.database_type === "free" ? "500k" : "?"} per month`}
                    />
                    <List.Item.Detail.Metadata.Label
                      icon={{ source: Icon.Dot, tintColor: Color.Green }}
                      title=""
                      text={`Writes...${stats.total_monthly_write_requests}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      icon={{ source: Icon.Dot, tintColor: Color.Blue }}
                      title=""
                      text={`Reads...${stats.total_monthly_read_requests}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Bandwidth"
                      text={`${stats.total_monthly_bandwidth} B / ${details.database_type === "free" ? "50" : "?"} GB`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Storage"
                      text={`${stats.total_monthly_storage} B / ${details.database_type === "free" ? "256" : "?"} MB`}
                    />
                    <List.Item.Detail.Metadata.Label title="Cost" text={`$${stats.total_monthly_billing}`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        </>
      )}
    </List>
  );
}
