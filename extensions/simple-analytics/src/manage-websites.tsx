import {
  List,
  ActionPanel,
  Action,
  Form,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Color,
  Image,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Website } from "./lib/types";
import {
  getWebsites,
  addWebsite,
  updateWebsite,
  removeWebsite,
  getActiveWebsiteId,
  setActiveWebsiteId,
} from "./lib/storage";
import { testConnection, getDashboardUrl } from "./lib/api";

const Icons = {
  globe: { source: "globe.svg" },
  plus: { source: "plus.svg" },
  check: { source: "check.svg" },
  pencil: { source: "pencil.svg" },
  trash: { source: "trash.svg" },
  wifi: { source: "wifi.svg" },
};

function getGlobeIcon(isActive: boolean): Image.ImageLike {
  return {
    source: "globe.svg",
    tintColor: isActive ? Color.Green : Color.SecondaryText,
  };
}

export default function ManageWebsites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [activeWebsiteId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function loadWebsites() {
    setIsLoading(true);
    const sites = await getWebsites();
    const activeId = await getActiveWebsiteId();
    setWebsites(sites);
    setActiveId(activeId);
    setIsLoading(false);
  }

  useEffect(() => {
    loadWebsites();
  }, []);

  async function handleSetActive(website: Website) {
    await setActiveWebsiteId(website.id);
    setActiveId(website.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Active website changed",
      message: website.label || website.domain,
    });
  }

  async function handleDelete(website: Website) {
    const confirmed = await confirmAlert({
      title: "Delete Website",
      message: `Are you sure you want to remove "${website.label || website.domain}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeWebsite(website.id);
      await loadWebsites();
      await showToast({
        style: Toast.Style.Success,
        title: "Website removed",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search websites...">
      {websites.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Websites Configured"
          description="Add your first website to start tracking analytics"
          icon={Icons.globe}
          actions={
            <ActionPanel>
              <Action
                title="Add Website"
                icon={Icons.plus}
                onAction={() => push(<AddWebsiteForm onSuccess={loadWebsites} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Websites" subtitle={`${websites.length} site${websites.length !== 1 ? "s" : ""}`}>
          {websites.map((website) => (
            <List.Item
              key={website.id}
              title={website.label || website.domain}
              subtitle={website.label ? website.domain : undefined}
              icon={getGlobeIcon(website.id === activeWebsiteId)}
              accessories={[website.id === activeWebsiteId ? { tag: { value: "Active", color: Color.Green } } : {}]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {website.id !== activeWebsiteId && (
                      <Action title="Set as Active" icon={Icons.check} onAction={() => handleSetActive(website)} />
                    )}
                    <Action.OpenInBrowser title="Open Dashboard" url={getDashboardUrl(website.domain)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Website"
                      icon={Icons.pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => push(<EditWebsiteForm website={website} onSuccess={loadWebsites} />)}
                    />
                    <Action
                      title="Test Connection"
                      icon={Icons.wifi}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: "Testing connection...",
                        });
                        const result = await testConnection(website.domain, website.apiKey);
                        if (result.success) {
                          toast.style = Toast.Style.Success;
                          toast.title = "Connection successful";
                        } else {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Connection failed";
                          toast.message = result.error;
                        }
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Add Website"
                      icon={Icons.plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => push(<AddWebsiteForm onSuccess={loadWebsites} />)}
                    />
                    <Action
                      title="Delete Website"
                      icon={Icons.trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(website)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface AddWebsiteFormProps {
  onSuccess: () => void;
}

function AddWebsiteForm({ onSuccess }: AddWebsiteFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [domainError, setDomainError] = useState<string | undefined>();

  async function handleSubmit(values: { domain: string; apiKey: string; label: string }) {
    const domain = values.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!domain) {
      setDomainError("Domain is required");
      return;
    }

    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing connection...",
    });

    const result = await testConnection(domain, values.apiKey || undefined);

    if (!result.success) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = result.error;
      setIsLoading(false);
      return;
    }

    await addWebsite({
      domain,
      apiKey: values.apiKey || undefined,
      label: values.label || undefined,
    });

    toast.style = Toast.Style.Success;
    toast.title = "Website added";
    toast.message = domain;

    onSuccess();
    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Website" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        info="The domain of your website tracked by Simple Analytics"
        error={domainError}
        onChange={() => setDomainError(undefined)}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="sa_api_key_..."
        info="Optional. Required only for private websites. Get it from simpleanalytics.com/account"
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="My Website"
        info="Optional. A friendly name to identify this website"
      />
    </Form>
  );
}

interface EditWebsiteFormProps {
  website: Website;
  onSuccess: () => void;
}

function EditWebsiteForm({ website, onSuccess }: EditWebsiteFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [domainError, setDomainError] = useState<string | undefined>();

  async function handleSubmit(values: { domain: string; apiKey: string; label: string }) {
    const domain = values.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!domain) {
      setDomainError("Domain is required");
      return;
    }

    setIsLoading(true);

    if (domain !== website.domain || values.apiKey !== (website.apiKey || "")) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Testing connection...",
      });

      const result = await testConnection(domain, values.apiKey || undefined);

      if (!result.success) {
        toast.style = Toast.Style.Failure;
        toast.title = "Connection failed";
        toast.message = result.error;
        setIsLoading(false);
        return;
      }

      toast.hide();
    }

    await updateWebsite(website.id, {
      domain,
      apiKey: values.apiKey || undefined,
      label: values.label || undefined,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Website updated",
    });

    onSuccess();
    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        defaultValue={website.domain}
        error={domainError}
        onChange={() => setDomainError(undefined)}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="sa_api_key_..."
        defaultValue={website.apiKey || ""}
        info="Optional. Required only for private websites."
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="My Website"
        defaultValue={website.label || ""}
        info="Optional. A friendly name to identify this website"
      />
    </Form>
  );
}
