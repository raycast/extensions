import { ActionPanel, Action, Icon, List, useNavigation, Detail, Form, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm, useLocalStorage, usePromise } from "@raycast/utils";
import { exec } from "child_process";

import { promisify } from "util";

let bin = "";

const execPromisified = promisify(exec);
type KeyVault = {
  id: string;
  name: string;
  location: string;
};

type Secrets = {
  name: string;
  id: string;
};

const getAsyncKeyVaults = async (): Promise<KeyVault[]> => {
  const result = await execPromisified(`${bin} keyvault list`);

  return JSON.parse(result.stdout);
};

const getAsyncSecrets = async (keyvault: string): Promise<Secrets[]> => {
  const result = await execPromisified(`${bin} keyvault secret list --vault-name ${keyvault}`);

  return JSON.parse(result.stdout);
};

const getAsyncSecretDetail = async (keyvault: string, secretName: string): Promise<SecretDetail | undefined> => {
  const result = await execPromisified(`${bin} keyvault secret show --vault-name ${keyvault} --name ${secretName}`);
  return JSON.parse(result.stdout);
};

type ListSecretType = {
  keyVault: string;
};

type SecretDetailType = {
  keyVault: string;
  secretName: string;
};

type SecretDetail = {
  attributes: {
    created: string;
    enabled: boolean;
    expires: string | null;
    notBefore: string | null;
    recoverableDays: number;
    recoveryLevel: string;
    updated: string;
  };
  contentType: string | null;
  id: string;
  kid: string | null;
  managed: boolean | null;
  name: string;
  tags: Record<string, string>;
  value: string;
};
function SecretDetail({ keyVault, secretName }: SecretDetailType) {
  const { isLoading, data } = usePromise(async () => {
    return getAsyncSecretDetail(keyVault, secretName);
  });

  const markdown = data
    ? `
# ${secretName}
### ${keyVault}
---

### ${data.value}
`
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={secretName}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={data?.value ?? ""} />
        </ActionPanel>
      }
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Created" text={new Date(data?.attributes.created ?? "").toLocaleString()} />
            <Detail.Metadata.Label title="Updated" text={new Date(data?.attributes.updated ?? "").toLocaleString()} />
            <Detail.Metadata.Label title="Enabled" text={data?.attributes.enabled ? "Yes" : "No"} />
            <Detail.Metadata.Separator />
            {data?.tags && Object.keys(data?.tags).length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {Object.entries(data?.tags).map(([key, value]) => (
                  <Detail.Metadata.TagList.Item key={key} text={`${key}: ${value}`} color={"#0078D4"} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        )
      }
    />
  );
}

function ListSecret({ keyVault }: ListSecretType) {
  const { push } = useNavigation();

  const { isLoading, data } = useCachedPromise(
    async (keyVault: string) => {
      return getAsyncSecrets(keyVault);
    },
    [keyVault],
  );
  return (
    <List isLoading={isLoading}>
      {data?.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Key}
          title={item.name}
          actions={
            <ActionPanel>
              <Action
                title="Select Vault"
                icon={Icon.Terminal}
                onAction={() => {
                  push(<SecretDetail keyVault={keyVault} secretName={item.name} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ListKeyVault() {
  const { push } = useNavigation();
  const { isLoading, data } = useCachedPromise(async () => {
    return getAsyncKeyVaults();
  });
  return (
    <List isLoading={isLoading}>
      {data?.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Key}
          title={item.name}
          subtitle={item.location}
          actions={
            <ActionPanel>
              <Action
                title="Select Vault"
                icon={Icon.Terminal}
                onAction={() => {
                  push(<ListSecret keyVault={item.name} />);
                }}
              />
              <Action
                title="Update Vault Binary"
                icon={Icon.AppWindow}
                onAction={() => {
                  push(<Settings />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
interface AzBinPathValues {
  path: string;
}

function Settings() {
  const { pop } = useNavigation();
  const { setValue, isLoading } = useLocalStorage<string>("azBin");
  const { handleSubmit, itemProps } = useForm<AzBinPathValues>({
    async onSubmit(values) {
      setValue(values.path);
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.path} saved`,
      });
      pop();
    },
    validation: {
      path: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="az binary path" placeholder="/Users/bin/az" {...itemProps.path} />
      <Form.Description text="Run 'where az' in a terminal and then paste the value here)" />
    </Form>
  );
}

export default function Command() {
  const { value, isLoading } = useLocalStorage<string>("azBin");

  if (!isLoading && value) {
    bin = value;
    return <ListKeyVault />;
  } else return <Settings />;
}
