import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useFetch, useForm } from "@raycast/utils";
import { App, CreateDomain, Domain, DomainStatus, DomainType } from "./types";
import { API_URL, headers, parseResponse } from "./koyeb";

const DOMAIN_STATUS_ICON: Record<DomainStatus, Image.ImageLike> = {
  PENDING: { source: Icon.Hourglass, tintColor: Color.Yellow },
  ACTIVE: { source: Icon.Check, tintColor: Color.Green },
  ERROR: { source: Icon.Warning, tintColor: Color.Red },
  DELETING: Icon.Clock,
  DELETED: Icon.Trash,
};

export default function ManageDomains() {
  const {
    isLoading,
    data: domains,
    error,
    revalidate,
    mutate,
  } = useFetch(API_URL + "domains", {
    headers,
    parseResponse,
    mapResult(result: { domains: Domain[] }) {
      return {
        data: result.domains,
      };
    },
    initialData: [],
  });

  async function confirmAndRemove(domain: Domain) {
    const options: Alert.Options = {
      title: `Are you sure you want to delete the ${domain.name} domain?`,
      message: "This can not be undone.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete domain",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Removing", domain.name);
      try {
        await mutate(
          fetch(API_URL + `domains/${domain.id}`, {
            method: "DELETE",
            headers,
          }).then(parseResponse),
          {
            optimisticUpdate(data) {
              return data.map((d) => (d.id === domain.id ? { ...d, status: DomainStatus.DELETING } : d));
            },
          },
        );
        toast.style = Toast.Style.Success;
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !domains.length && !error ? (
        <List.EmptyView
          title="You don't have any domains yet"
          description="Domains allow you to access your Apps using your own domains"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        domains.map((domain) => (
          <List.Item
            key={domain.id}
            icon={getFavicon(`https://${domain.name}`)}
            title={domain.name}
            accessories={[
              { icon: DOMAIN_STATUS_ICON[domain.status], tag: domain.status },
              { date: new Date(domain.updated_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={revalidate} />
                {domain.type === DomainType.AUTOASSIGNED && (
                  <Action
                    icon={Icon.Trash}
                    title="Remove"
                    onAction={() => confirmAndRemove(domain)}
                    style={Action.Style.Destructive}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddDomain() {
  const { pop } = useNavigation();
  const { isLoading, data: apps } = useFetch("https://app.koyeb.com/v1/apps", {
    headers,
    parseResponse,
    mapResult(result: { apps: App[] }) {
      return {
        data: result.apps,
      };
    },
    initialData: [],
  });

  const { handleSubmit, itemProps } = useForm<CreateDomain>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Domain", values.name);
      try {
        const response = await fetch(API_URL + "domains", {
          method: "POST",
          headers,
          body: JSON.stringify(values),
        });
        await parseResponse(response);
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
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a custom domain and assign it to one of your Koyeb app" />
      <Form.TextField title="Domain name" placeholder="example.com" {...itemProps.name} />
      <Form.Dropdown title="Type" {...itemProps.type} info="AUTOASSIGNED: Domain like <appName>-<orgName>.koyeb.app">
        <Form.Dropdown.Item title="AUTOASSIGNED" value="AUTOASSIGNED" />
        <Form.Dropdown.Item title="CUSTOM" value="CUSTOM" />
      </Form.Dropdown>
      <Form.Dropdown title="Assign to Koyeb app" {...itemProps.app_id}>
        {apps.map((app) => (
          <Form.Dropdown.Item key={app.id} title={app.name} value={app.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
