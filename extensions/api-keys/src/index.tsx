import {
  List,
  ActionPanel,
  Action,
  Icon,
  open,
  showToast,
  Toast,
  Clipboard,
  Form,
  LocalStorage,
} from "@raycast/api";
import {
  faviconUrl,
  Provider,
  fetchProviders,
  hasUrlVariables,
  providersApiUrl,
  providerStorageKey,
  resolveProviderUrl,
} from "./providers";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

type SavedVariableValues = Record<string, Record<string, string>>;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [savedVariableOverrides, setSavedVariableOverrides] =
    useState<SavedVariableValues>({});
  const {
    data = { providers: [], savedVariableValues: {} },
    error: loadError,
    isLoading,
    revalidate,
  } = useCachedPromise(loadProviderData);
  const { providers } = data;
  const savedVariableValues = {
    ...data.savedVariableValues,
    ...savedVariableOverrides,
  };

  function updateSavedValues(
    provider: Provider,
    values: Record<string, string>,
  ) {
    setSavedVariableOverrides((currentValues) => ({
      ...currentValues,
      [providerKey(provider)]: values,
    }));
  }

  const filteredProviders = useMemo(() => {
    if (!searchText) return providers;
    const lower = searchText.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        p.url.toLowerCase().includes(lower),
    );
  }, [providers, searchText]);

  const grouped = useMemo(() => {
    const groups: Record<string, Provider[]> = {};
    for (const p of filteredProviders) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }
    return groups;
  }, [filteredProviders]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={false}
      isLoading={isLoading}
    >
      {loadError ? (
        <List.EmptyView
          title="Could not load providers"
          description={loadError.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Open Provider Catalog"
                url={providersApiUrl}
              />
            </ActionPanel>
          }
        />
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <List.Section key={category} title={category}>
            {items.map((provider) => {
              const savedValues =
                savedVariableValues[providerKey(provider)] ?? {};

              return (
                <List.Item
                  key={provider.name + provider.url}
                  title={provider.name}
                  subtitle={getProviderSubtitle(provider, savedValues)}
                  accessories={getProviderAccessories(provider, savedValues)}
                  icon={{ source: faviconUrl(provider.domain), mask: "auto" }}
                  actions={
                    <ActionPanel>
                      <ProviderActions
                        provider={provider}
                        savedValues={savedValues}
                        onSavedValuesChange={(values) =>
                          updateSavedValues(provider, values)
                        }
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}

function ProviderActions({
  provider,
  savedValues,
  onSavedValuesChange,
}: {
  provider: Provider;
  savedValues: Record<string, string>;
  onSavedValuesChange: (values: Record<string, string>) => void;
}) {
  if (!hasUrlVariables(provider)) {
    return (
      <>
        <Action.OpenInBrowser url={provider.url} />
        <Action
          title="Copy Dashboard URL"
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.copy(provider.url);
            await showToast(Toast.Style.Success, "URL copied");
          }}
        />
      </>
    );
  }

  const hasAllSavedValues = (provider.variables ?? []).every(
    (variable) => savedValues[variable.key],
  );
  const resolvedUrl = resolveProviderUrl(provider, savedValues);

  return (
    <>
      {hasAllSavedValues ? (
        <>
          <Action.OpenInBrowser url={resolvedUrl} />
          <Action
            title="Copy Dashboard URL"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(resolvedUrl);
              await showToast(Toast.Style.Success, "URL copied");
            }}
          />
        </>
      ) : (
        <>
          <Action.Push
            title="Set Variables and Open Dashboard"
            icon={Icon.Globe}
            target={
              <ProviderVariablesForm
                provider={provider}
                action="open"
                initialValues={savedValues}
                onSavedValuesChange={onSavedValuesChange}
              />
            }
          />
          <Action.Push
            title="Set Variables and Copy URL"
            icon={Icon.Clipboard}
            target={
              <ProviderVariablesForm
                provider={provider}
                action="copy"
                initialValues={savedValues}
                onSavedValuesChange={onSavedValuesChange}
              />
            }
          />
        </>
      )}
      <Action.Push
        title="Update URL Variables"
        icon={Icon.Gear}
        target={
          <ProviderVariablesForm
            provider={provider}
            action="save"
            initialValues={savedValues}
            onSavedValuesChange={onSavedValuesChange}
          />
        }
      />
    </>
  );
}

function ProviderVariablesForm({
  provider,
  action,
  initialValues,
  onSavedValuesChange,
}: {
  provider: Provider;
  action: "open" | "copy" | "save";
  initialValues: Record<string, string>;
  onSavedValuesChange: (values: Record<string, string>) => void;
}) {
  const [savedValues, setSavedValues] =
    useState<Record<string, string>>(initialValues);

  async function handleSubmit(values: Record<string, string>) {
    const trimmedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim()]),
    );
    const missingVariable = provider.variables?.find(
      (variable) => !trimmedValues[variable.key],
    );

    if (missingVariable) {
      await showToast(
        Toast.Style.Failure,
        `${missingVariable.label} is required`,
      );
      return;
    }

    await Promise.all(
      Object.entries(trimmedValues).map(([key, value]) =>
        LocalStorage.setItem(providerStorageKey(provider, key), value),
      ),
    );
    onSavedValuesChange(trimmedValues);

    const resolvedUrl = resolveProviderUrl(provider, trimmedValues);

    if (action === "copy") {
      await Clipboard.copy(resolvedUrl);
      await showToast(Toast.Style.Success, "URL copied");
      return;
    }

    if (action === "save") {
      await showToast(Toast.Style.Success, "URL variables saved");
      return;
    }

    await open(resolvedUrl);
  }

  return (
    <Form
      navigationTitle={provider.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              action === "copy"
                ? "Copy Dashboard URL"
                : action === "save"
                  ? "Save Variables"
                  : "Open Dashboard"
            }
            icon={
              action === "copy"
                ? Icon.Clipboard
                : action === "save"
                  ? Icon.Checkmark
                  : Icon.Globe
            }
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {(provider.variables ?? []).map((variable) => (
        <Form.TextField
          key={variable.key}
          id={variable.key}
          title={variable.label}
          placeholder={variable.placeholder}
          value={savedValues[variable.key] ?? ""}
          onChange={(value) =>
            setSavedValues((currentValues) => ({
              ...currentValues,
              [variable.key]: value,
            }))
          }
        />
      ))}
    </Form>
  );
}

async function getSavedVariableValues(provider: Provider) {
  const entries = await Promise.all(
    (provider.variables ?? []).map(async (variable) => [
      variable.key,
      (await LocalStorage.getItem<string>(
        providerStorageKey(provider, variable.key),
      )) ?? "",
    ]),
  );

  return Object.fromEntries(entries);
}

async function loadProviderData() {
  const providers = await fetchProviders();
  const savedVariableEntries = await Promise.all(
    providers
      .filter(hasUrlVariables)
      .map(async (provider) => [
        providerKey(provider),
        await getSavedVariableValues(provider),
      ]),
  );

  return {
    providers,
    savedVariableValues: Object.fromEntries(savedVariableEntries),
  };
}

function providerKey(provider: Provider) {
  return `${provider.name}:${provider.url}`;
}

function getProviderSubtitle(
  provider: Provider,
  savedValues: Record<string, string>,
) {
  if (!hasUrlVariables(provider)) return provider.domain;

  const missingVariables = (provider.variables ?? []).filter(
    (variable) => !savedValues[variable.key],
  );

  if (missingVariables.length > 0) {
    return `Set ${missingVariables.map((variable) => variable.label).join(", ")}`;
  }

  return resolveProviderUrl(provider, savedValues);
}

function getProviderAccessories(
  provider: Provider,
  savedValues: Record<string, string>,
) {
  if (!hasUrlVariables(provider)) return [];

  return (provider.variables ?? []).map((variable) => ({
    text: savedValues[variable.key]
      ? `${variable.label}: ${savedValues[variable.key]}`
      : variable.label,
    icon: savedValues[variable.key] ? Icon.Checkmark : Icon.Gear,
  }));
}
