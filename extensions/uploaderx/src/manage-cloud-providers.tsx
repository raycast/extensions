import { Action, ActionPanel, List, showToast, Toast, confirmAlert, Icon, Form, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getAllProviders,
  setDefaultProvider,
  deleteProvider,
  CloudProviderAccount,
  CloudProviderType,
  addOrUpdateProvider,
  createNewProviderAccount,
} from "./cloudProviders";

export default function Command() {
  const [providers, setProviders] = useState<CloudProviderAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    setProviders(await getAllProviders());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSetDefault(id: string) {
    await setDefaultProvider(id);
    await showToast({ style: Toast.Style.Success, title: "Default provider set" });
    refresh();
  }

  async function handleDelete(id: string) {
    if (
      await confirmAlert({
        title: "Delete Provider?",
        message: "Are you sure you want to delete this provider?",
        icon: Icon.Trash,
      })
    ) {
      await deleteProvider(id);
      await showToast({ style: Toast.Style.Success, title: "Provider deleted" });
      refresh();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search providers..."
      actions={
        <ActionPanel>
          <AddProviderAction onProviderAdded={refresh} />
        </ActionPanel>
      }
    >
      {providers.length === 0 ? (
        <List.EmptyView
          title="No providers added"
          description={"Add a cloud provider to get started.\n\nPress ⌘N or Enter to add a provider."}
          actions={
            <ActionPanel>
              <AddProviderAction onProviderAdded={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        providers.map((provider) => (
          <List.Item
            key={provider.id}
            title={provider.displayName}
            subtitle={provider.providerType}
            accessories={[
              provider.isDefault ? { icon: Icon.Star, tooltip: "Default" } : {},
              { text: provider.accessLevel },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Provider"
                  target={<EditProviderForm provider={provider} onProviderUpdated={refresh} />}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <AddProviderAction onProviderAdded={refresh} />
                <Action
                  title="Duplicate Provider"
                  icon={Icon.Duplicate}
                  onAction={() => duplicateProvider(provider, refresh, push)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                {!provider.isDefault && (
                  <Action
                    title="Set as Default"
                    onAction={() => handleSetDefault(provider.id)}
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                )}
                <Action
                  title="Delete Provider"
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(provider.id)}
                  icon={Icon.Trash}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddProviderAction({ onProviderAdded }: { onProviderAdded: () => void }) {
  return (
    <Action.Push
      title="Add Provider"
      target={<AddProviderForm onProviderAdded={onProviderAdded} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

function duplicateProvider(
  provider: CloudProviderAccount,
  onProviderAdded: () => void,
  push: (element: React.ReactElement) => void,
) {
  // Create a new provider with the same details but a new id and isDefault false
  const newProvider = {
    ...provider,
    id: undefined as string | undefined, // will be set by createNewProviderAccount
    isDefault: false,
  };
  const account = createNewProviderAccount(
    newProvider.providerType,
    newProvider.displayName + " (Copy)",
    newProvider.credentials,
    newProvider.defaultPath,
    newProvider.accessLevel,
  );
  addOrUpdateProvider(account).then(() => {
    onProviderAdded();
    push(<EditProviderForm provider={account} onProviderUpdated={onProviderAdded} />);
  });
}

const BUNNY_REGIONS = [
  { label: "Frankfurt, DE", value: "storage.bunnycdn.com" },
  { label: "London, UK", value: "uk.storage.bunnycdn.com" },
  { label: "New York, US", value: "ny.storage.bunnycdn.com" },
  { label: "Los Angeles, US", value: "la.storage.bunnycdn.com" },
  { label: "Singapore, SG", value: "sg.storage.bunnycdn.com" },
  { label: "Stockholm, SE", value: "se.storage.bunnycdn.com" },
  { label: "São Paulo, BR", value: "br.storage.bunnycdn.com" },
  { label: "Johannesburg, SA", value: "jh.storage.bunnycdn.com" },
  { label: "Sydney, SYD", value: "syd.storage.bunnycdn.com" },
];

// Placeholder for Add Provider form
function AddProviderForm({ onProviderAdded }: { onProviderAdded: () => void }) {
  const { pop } = useNavigation();
  const [form, setForm] = useState({
    providerType: CloudProviderType.S3,
    displayName: "",
    accessKeyId: "",
    bucket: "",
    secretAccessKey: "",
    endpoint: "",
    region: "",
    storageZone: "",
    apiKey: "",
    defaultPath: "",
    accessLevel: "public" as "public" | "private",
    domain: "",
    storageEndpoint: BUNNY_REGIONS[0].value,
    pullZoneDomain: "",
  });

  // Reset only fields that are not relevant when providerType changes
  useEffect(() => {
    if (form.providerType === CloudProviderType.S3) {
      setForm((prev) => ({ ...prev, storageZone: "", apiKey: "" }));
    } else if (form.providerType === CloudProviderType.BunnyCDN) {
      setForm((prev) => ({
        ...prev,
        accessKeyId: "",
        secretAccessKey: "",
        bucket: "",
        endpoint: "",
        region: "",
        domain: "",
      }));
    }
  }, [form.providerType]);

  async function handleSubmit() {
    let credentials: Record<string, string> = {};
    if (form.providerType === CloudProviderType.S3) {
      credentials = {
        accessKeyId: form.accessKeyId,
        secretAccessKey: form.secretAccessKey,
        bucket: form.bucket,
        endpoint: form.endpoint,
        region: form.region,
      };
      if (form.accessLevel === "public" && form.domain) credentials.domain = form.domain;
    } else if (form.providerType === CloudProviderType.BunnyCDN) {
      let pullZoneName = form.pullZoneDomain.trim();
      // Remove protocol, .b-cdn.net, and slashes
      pullZoneName = pullZoneName
        .replace(/^https?:\/\//, "")
        .replace(/\.b-cdn\.net.*/, "")
        .replace(/\/$/, "");
      credentials = { storageZone: form.storageZone, apiKey: form.apiKey, storageEndpoint: form.storageEndpoint };
      if (pullZoneName) credentials.pullZoneDomain = pullZoneName;
    }
    const account = createNewProviderAccount(
      form.providerType,
      form.displayName,
      credentials,
      form.defaultPath,
      form.accessLevel,
    );
    await addOrUpdateProvider(account);
    await showToast({ style: Toast.Style.Success, title: "Provider added" });
    onProviderAdded();
    pop();
  }

  return (
    <Form
      navigationTitle="Add Cloud Provider"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Provider" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="providerType"
        title="Provider Type"
        value={form.providerType}
        onChange={(v) => setForm((prev) => ({ ...prev, providerType: v as CloudProviderType }))}
      >
        <Form.Dropdown.Item value={CloudProviderType.S3} title="S3-Compatible" />
        <Form.Dropdown.Item value={CloudProviderType.BunnyCDN} title="BunnyCDN" />
      </Form.Dropdown>
      <Form.TextField
        id="displayName"
        title="Display Name"
        value={form.displayName}
        onChange={(v) => setForm((prev) => ({ ...prev, displayName: v }))}
      />
      {form.providerType === CloudProviderType.S3 && (
        <>
          <Form.TextField
            id="accessKeyId"
            title="Access Key ID"
            value={form.accessKeyId}
            onChange={(v) => setForm((prev) => ({ ...prev, accessKeyId: v }))}
          />
          <Form.TextField
            id="bucket"
            title="Bucket Name"
            value={form.bucket}
            onChange={(v) => setForm((prev) => ({ ...prev, bucket: v }))}
            placeholder="e.g. my-bucket"
          />
          <Form.PasswordField
            id="secretAccessKey"
            title="Secret Access Key"
            value={form.secretAccessKey}
            onChange={(v) => setForm((prev) => ({ ...prev, secretAccessKey: v }))}
          />
          <Form.TextField
            id="endpoint"
            title="Endpoint (optional)"
            value={form.endpoint}
            onChange={(v) => setForm((prev) => ({ ...prev, endpoint: v }))}
            placeholder="e.g. https://s3.amazonaws.com"
          />
          <Form.TextField
            id="region"
            title="Region (optional)"
            value={form.region}
            onChange={(v) => setForm((prev) => ({ ...prev, region: v }))}
            placeholder="e.g. us-east-1"
          />
          {form.accessLevel === "public" && (
            <Form.TextField
              id="domain"
              title="Domain (optional)"
              value={form.domain}
              onChange={(v) => setForm((prev) => ({ ...prev, domain: v }))}
              placeholder="e.g. https://pub-xxxxxx.r2.dev"
              info="If set, this will be used as the base URL for public links."
            />
          )}
        </>
      )}
      {form.providerType === CloudProviderType.BunnyCDN && (
        <>
          <Form.TextField
            id="storageZone"
            title="Storage Zone Name"
            value={form.storageZone}
            onChange={(v) => setForm((prev) => ({ ...prev, storageZone: v }))}
          />
          <Form.PasswordField
            id="apiKey"
            title="API Key"
            value={form.apiKey}
            onChange={(v) => setForm((prev) => ({ ...prev, apiKey: v }))}
          />
          <Form.Dropdown
            id="storageEndpoint"
            title="Region"
            value={form.storageEndpoint}
            onChange={(v) => setForm((prev) => ({ ...prev, storageEndpoint: v }))}
          >
            {BUNNY_REGIONS.map((r) => (
              <Form.Dropdown.Item key={r.value} value={r.value} title={r.label} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="pullZoneDomain"
            title="Pull Zone Name (optional)"
            value={form.pullZoneDomain}
            onChange={(v) => setForm((prev) => ({ ...prev, pullZoneDomain: v }))}
            placeholder="e.g. newyork"
            info="If set, this will be used to construct the public link as https://[pull zone name].b-cdn.net/"
          />
        </>
      )}
      <Form.TextField
        id="defaultPath"
        title="Default Path (optional)"
        value={form.defaultPath}
        onChange={(v) => setForm((prev) => ({ ...prev, defaultPath: v }))}
        placeholder="e.g. uploads/"
      />
      <Form.Dropdown
        id="accessLevel"
        title="Access Level"
        value={form.accessLevel}
        onChange={(v) => setForm((prev) => ({ ...prev, accessLevel: v as "public" | "private" }))}
      >
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>
    </Form>
  );
}

// Placeholder for Edit Provider form
function EditProviderForm({
  provider,
  onProviderUpdated,
}: {
  provider: CloudProviderAccount;
  onProviderUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const [form, setForm] = useState({
    providerType: provider.providerType,
    displayName: provider.displayName,
    accessKeyId: provider.credentials.accessKeyId || "",
    bucket: provider.credentials.bucket || "",
    secretAccessKey: provider.credentials.secretAccessKey || "",
    endpoint: provider.credentials.endpoint || "",
    region: provider.credentials.region || "",
    storageZone: provider.credentials.storageZone || "",
    apiKey: provider.credentials.apiKey || "",
    defaultPath: provider.defaultPath || "",
    accessLevel: provider.accessLevel,
    domain: provider.credentials.domain || "",
    storageEndpoint: provider.credentials.storageEndpoint || BUNNY_REGIONS[0].value,
    pullZoneDomain: provider.credentials.pullZoneDomain || "",
  });

  useEffect(() => {
    setForm({
      providerType: provider.providerType,
      displayName: provider.displayName,
      accessKeyId: provider.credentials.accessKeyId || "",
      bucket: provider.credentials.bucket || "",
      secretAccessKey: provider.credentials.secretAccessKey || "",
      endpoint: provider.credentials.endpoint || "",
      region: provider.credentials.region || "",
      storageZone: provider.credentials.storageZone || "",
      apiKey: provider.credentials.apiKey || "",
      defaultPath: provider.defaultPath || "",
      accessLevel: provider.accessLevel,
      domain: provider.credentials.domain || "",
      storageEndpoint: provider.credentials.storageEndpoint || BUNNY_REGIONS[0].value,
      pullZoneDomain: provider.credentials.pullZoneDomain || "",
    });
  }, [provider]);

  async function handleSubmit() {
    let credentials: Record<string, string> = {};
    if (form.providerType === CloudProviderType.S3) {
      credentials = {
        accessKeyId: form.accessKeyId,
        secretAccessKey: form.secretAccessKey,
        bucket: form.bucket,
        endpoint: form.endpoint,
        region: form.region,
      };
      if (form.accessLevel === "public" && form.domain) credentials.domain = form.domain;
    } else if (form.providerType === CloudProviderType.BunnyCDN) {
      let pullZoneName = form.pullZoneDomain.trim();
      // Remove protocol, .b-cdn.net, and slashes
      pullZoneName = pullZoneName
        .replace(/^https?:\/\//, "")
        .replace(/\.b-cdn\.net.*/, "")
        .replace(/\/$/, "");
      credentials = { storageZone: form.storageZone, apiKey: form.apiKey, storageEndpoint: form.storageEndpoint };
      if (pullZoneName) credentials.pullZoneDomain = pullZoneName;
    }
    const updatedProvider = {
      ...provider,
      displayName: form.displayName,
      credentials,
      defaultPath: form.defaultPath,
      accessLevel: form.accessLevel,
    };
    await addOrUpdateProvider(updatedProvider);
    await showToast({ style: Toast.Style.Success, title: "Provider updated" });
    onProviderUpdated();
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit Provider: ${provider.displayName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="providerType"
        title="Provider Type (locked)"
        value={form.providerType}
        onChange={() => {}}
        info="Provider type cannot be changed after creation."
      >
        <Form.Dropdown.Item value={CloudProviderType.S3} title="S3-Compatible" />
        <Form.Dropdown.Item value={CloudProviderType.BunnyCDN} title="BunnyCDN" />
      </Form.Dropdown>
      <Form.TextField
        id="displayName"
        title="Display Name"
        value={form.displayName}
        onChange={(v) => setForm((prev) => ({ ...prev, displayName: v }))}
      />
      {form.providerType === CloudProviderType.S3 && (
        <>
          <Form.TextField
            id="accessKeyId"
            title="Access Key ID"
            value={form.accessKeyId}
            onChange={(v) => setForm((prev) => ({ ...prev, accessKeyId: v }))}
          />
          <Form.TextField
            id="bucket"
            title="Bucket Name"
            value={form.bucket}
            onChange={(v) => setForm((prev) => ({ ...prev, bucket: v }))}
            placeholder="e.g. my-bucket"
          />
          <Form.PasswordField
            id="secretAccessKey"
            title="Secret Access Key"
            value={form.secretAccessKey}
            onChange={(v) => setForm((prev) => ({ ...prev, secretAccessKey: v }))}
          />
          <Form.TextField
            id="endpoint"
            title="Endpoint (optional)"
            value={form.endpoint}
            onChange={(v) => setForm((prev) => ({ ...prev, endpoint: v }))}
            placeholder="e.g. https://s3.amazonaws.com"
          />
          <Form.TextField
            id="region"
            title="Region (optional)"
            value={form.region}
            onChange={(v) => setForm((prev) => ({ ...prev, region: v }))}
            placeholder="e.g. us-east-1"
          />
          {form.accessLevel === "public" && (
            <Form.TextField
              id="domain"
              title="Domain (optional)"
              value={form.domain}
              onChange={(v) => setForm((prev) => ({ ...prev, domain: v }))}
              placeholder="e.g. https://pub-xxxxxx.r2.dev"
              info="If set, this will be used as the base URL for public links."
            />
          )}
        </>
      )}
      {form.providerType === CloudProviderType.BunnyCDN && (
        <>
          <Form.TextField
            id="storageZone"
            title="Storage Zone Name"
            value={form.storageZone}
            onChange={(v) => setForm((prev) => ({ ...prev, storageZone: v }))}
          />
          <Form.PasswordField
            id="apiKey"
            title="API Key"
            value={form.apiKey}
            onChange={(v) => setForm((prev) => ({ ...prev, apiKey: v }))}
          />
          <Form.Dropdown
            id="storageEndpoint"
            title="Region"
            value={form.storageEndpoint}
            onChange={(v) => setForm((prev) => ({ ...prev, storageEndpoint: v }))}
          >
            {BUNNY_REGIONS.map((r) => (
              <Form.Dropdown.Item key={r.value} value={r.value} title={r.label} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="pullZoneDomain"
            title="Pull Zone Name (optional)"
            value={form.pullZoneDomain}
            onChange={(v) => setForm((prev) => ({ ...prev, pullZoneDomain: v }))}
            placeholder="e.g. newyork"
            info="If set, this will be used to construct the public link as https://[pull zone name].b-cdn.net/"
          />
        </>
      )}
      <Form.TextField
        id="defaultPath"
        title="Default Path (optional)"
        value={form.defaultPath}
        onChange={(v) => setForm((prev) => ({ ...prev, defaultPath: v }))}
        placeholder="e.g. uploads/"
      />
      <Form.Dropdown
        id="accessLevel"
        title="Access Level"
        value={form.accessLevel}
        onChange={(v) => setForm((prev) => ({ ...prev, accessLevel: v as "public" | "private" }))}
      >
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>
    </Form>
  );
}
