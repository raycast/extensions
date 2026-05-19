import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  showInFinder,
  Toast,
} from "@raycast/api";
import * as path from "path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ProviderPresetIconList,
  UploadProviderIconForm,
} from "./ProviderIconForms";
import {
  addDisabledModel,
  addDisabledProvider,
  loadDisabledConfig,
  removeDisabledModel,
  removeDisabledProvider,
  saveDisabledConfig,
} from "./disabledStorage";
import ProviderDetail from "./ProviderDetail";
import ProviderForm from "./ProviderForm";
import {
  copyCustomIconToSupport,
  duplicateProviderIcon,
  EMPTY_PROVIDER_ICONS_CONFIG,
  getProviderIconRef,
  isCustomIconStillReferenced,
  loadProviderIconsConfig,
  ProviderIconsConfig,
  removeCustomIconFile,
  removeProviderIcon,
  resolveProviderListIcon,
  saveProviderIconsConfig,
  setProviderCustomIcon,
  setProviderPresetIcon,
} from "./providerIcons";
import { DisabledConfig, Model, Provider, ProvidersConfig } from "./types";
import {
  getProvidersMtimeMs,
  getProvidersPath,
  hasProvidersBackup,
  ProvidersFileChangedError,
  readProviders,
  restoreProvidersBackup,
  writeProviders,
} from "./yaml";

const EMPTY_DISABLED_CONFIG: DisabledConfig = {
  providers: [],
  modelsByProvider: {},
};

interface ProvidersLoadState {
  config: ProvidersConfig;
  mtimeMs?: number;
  readError?: string;
}

function loadProvidersState(): ProvidersLoadState {
  try {
    return { config: readProviders(), mtimeMs: getProvidersMtimeMs() };
  } catch (e) {
    return {
      config: { providers: [] },
      mtimeMs: undefined,
      readError: String(e),
    };
  }
}

export default function ManageProviders() {
  const providersPath = getProvidersPath();
  const [{ config, mtimeMs, readError }, setProvidersState] =
    useState<ProvidersLoadState>(loadProvidersState);
  const providersMtimeRef = useRef(mtimeMs);
  const [disabledConfig, setDisabledConfig] = useState<DisabledConfig>(
    EMPTY_DISABLED_CONFIG,
  );
  const [providerIconsConfig, setProviderIconsConfig] =
    useState<ProviderIconsConfig>(EMPTY_PROVIDER_ICONS_CONFIG);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadDisabledConfig();
        setDisabledConfig(loaded);
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load disabled entries",
          message: String(e),
        });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadProviderIconsConfig();
        setProviderIconsConfig(loaded);
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load provider icons",
          message: String(e),
        });
      }
    })();
  }, []);

  const persistAll = useCallback(
    async (
      nextConfig: ProvidersConfig,
      nextDisabledConfig: DisabledConfig,
      successTitle = "Saved",
    ) => {
      if (readError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Fix providers.yaml before saving",
          message: readError,
        });
        return false;
      }

      async function save(force = false) {
        const nextMtimeMs = writeProviders(nextConfig, {
          expectedMtimeMs: providersMtimeRef.current,
          force,
        });
        providersMtimeRef.current = nextMtimeMs;
        await saveDisabledConfig(nextDisabledConfig);
        setProvidersState({ config: nextConfig, mtimeMs: nextMtimeMs });
        setDisabledConfig(nextDisabledConfig);
        showToast({ style: Toast.Style.Success, title: successTitle });
        return true;
      }

      try {
        return await save();
      } catch (e) {
        if (e instanceof ProvidersFileChangedError) {
          const overwrite = await confirmAlert({
            title: "providers.yaml Changed Outside Raycast",
            message:
              "The file was modified after this extension loaded it. Overwrite those external changes with the current Raycast state?",
            primaryAction: {
              title: "Overwrite",
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (!overwrite) {
            showToast({
              style: Toast.Style.Failure,
              title: "Save cancelled",
              message: "Reload providers.yaml before saving again.",
            });
            return false;
          }

          try {
            return await save(true);
          } catch (forceError) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to overwrite",
              message: String(forceError),
            });
            return false;
          }
        }

        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save",
          message: String(e),
        });
        return false;
      }
    },
    [readError],
  );

  const persistProviderIcons = useCallback(
    async (nextConfig: ProviderIconsConfig) => {
      await saveProviderIconsConfig(nextConfig);
      setProviderIconsConfig(nextConfig);
    },
    [],
  );

  const allProviderIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...config.providers.map((p) => p.id),
          ...disabledConfig.providers.map((p) => p.id),
        ]),
      ),
    [config.providers, disabledConfig.providers],
  );

  const deleteProvider = useCallback(
    async (providerId: string) => {
      if (
        !(await confirmAlert({
          title: "Delete Provider?",
          message: `Are you sure you want to delete provider "${providerId}"?`,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      ) {
        return false;
      }

      const providers = config.providers.filter((p) => p.id !== providerId);
      const disabledProviders = disabledConfig.providers.filter(
        (p) => p.id !== providerId,
      );
      const modelsByProvider = { ...disabledConfig.modelsByProvider };
      delete modelsByProvider[providerId];

      const saved = await persistAll(
        { providers },
        { providers: disabledProviders, modelsByProvider },
      );
      if (!saved) return false;

      const iconRef = getProviderIconRef(providerIconsConfig, providerId);
      if (!iconRef) return true;

      const nextIcons = removeProviderIcon(providerIconsConfig, providerId);
      try {
        await persistProviderIcons(nextIcons);
        if (
          iconRef.type === "custom" &&
          !isCustomIconStillReferenced(nextIcons, iconRef.fileName)
        ) {
          removeCustomIconFile(iconRef.fileName);
        }
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to clean provider icon",
          message: String(e),
        });
      }

      return true;
    },
    [
      config.providers,
      disabledConfig,
      persistAll,
      persistProviderIcons,
      providerIconsConfig,
    ],
  );

  const disableProvider = useCallback(
    async (provider: Provider) => {
      if (
        !(await confirmAlert({
          title: "Disable Provider?",
          message: `Disable provider "${provider.name}"? It will be removed from providers.yaml.`,
          primaryAction: {
            title: "Disable",
          },
        }))
      ) {
        return;
      }

      const providers = config.providers.filter((p) => p.id !== provider.id);
      const nextDisabled = addDisabledProvider(disabledConfig, {
        ...provider,
        enabled: false,
      });
      await persistAll({ providers }, nextDisabled, "Provider disabled");
    },
    [config.providers, disabledConfig, persistAll],
  );

  const enableProvider = useCallback(
    async (providerId: string) => {
      const { provider, nextConfig: nextDisabled } = removeDisabledProvider(
        disabledConfig,
        providerId,
      );
      if (!provider) {
        showToast({
          style: Toast.Style.Failure,
          title: "Provider not found",
          message: providerId,
        });
        return;
      }

      if (config.providers.some((p) => p.id === provider.id)) {
        showToast({
          style: Toast.Style.Failure,
          title: "ID conflict",
          message: `Provider "${provider.id}" already exists`,
        });
        return;
      }

      const restoredProvider = { ...provider, enabled: true };
      await persistAll(
        { providers: [...config.providers, restoredProvider] },
        nextDisabled,
        "Provider enabled",
      );
    },
    [config.providers, disabledConfig, persistAll],
  );

  const disableModel = useCallback(
    async (providerId: string, model: Model) => {
      const targetProvider = config.providers.find((p) => p.id === providerId);
      if (!targetProvider) return;

      const providers = config.providers.map((p) =>
        p.id === providerId
          ? { ...p, models: p.models.filter((m) => m.id !== model.id) }
          : p,
      );
      const nextDisabled = addDisabledModel(disabledConfig, providerId, {
        ...model,
        enabled: false,
      });
      await persistAll({ providers }, nextDisabled, "Model disabled");
    },
    [config.providers, disabledConfig, persistAll],
  );

  const enableModel = useCallback(
    async (providerId: string, modelId: string) => {
      const targetProvider = config.providers.find((p) => p.id === providerId);
      if (!targetProvider) return;

      const { model, nextConfig: nextDisabled } = removeDisabledModel(
        disabledConfig,
        providerId,
        modelId,
      );
      if (!model) {
        showToast({
          style: Toast.Style.Failure,
          title: "Model not found",
          message: modelId,
        });
        return;
      }

      if (targetProvider.models.some((m) => m.id === model.id)) {
        showToast({
          style: Toast.Style.Failure,
          title: "ID conflict",
          message: `Model "${model.id}" already exists`,
        });
        return;
      }

      const providers = config.providers.map((p) =>
        p.id === providerId
          ? { ...p, models: [...p.models, { ...model, enabled: true }] }
          : p,
      );
      await persistAll({ providers }, nextDisabled, "Model enabled");
    },
    [config.providers, disabledConfig, persistAll],
  );

  const openProvidersYamlPath = useCallback(async () => {
    try {
      await showInFinder(path.dirname(providersPath));
      showToast({
        style: Toast.Style.Success,
        title: "Opened providers.yaml directory",
        message: `Opened directory: ${path.dirname(providersPath)}`,
      });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open path",
        message: String(e),
      });
    }
  }, [providersPath]);

  const reloadProvidersConfig = useCallback(() => {
    const nextState = loadProvidersState();
    providersMtimeRef.current = nextState.mtimeMs;
    setProvidersState(nextState);
    showToast({
      style: nextState.readError ? Toast.Style.Failure : Toast.Style.Success,
      title: nextState.readError
        ? "Failed to read providers.yaml"
        : "Reloaded providers.yaml",
      message: nextState.readError,
    });
  }, []);

  const restoreProvidersConfigBackup = useCallback(async () => {
    if (!hasProvidersBackup()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No providers.yaml backup found",
      });
      return;
    }

    if (
      !(await confirmAlert({
        title: "Restore providers.yaml Backup?",
        message:
          "This will replace the current providers.yaml with .providers.yaml.bak.",
        primaryAction: {
          title: "Restore Backup",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    ) {
      return;
    }

    try {
      const restoredConfig = restoreProvidersBackup();
      const restoredMtimeMs = getProvidersMtimeMs();
      providersMtimeRef.current = restoredMtimeMs;
      setProvidersState({
        config: restoredConfig,
        mtimeMs: restoredMtimeMs,
      });
      showToast({
        style: Toast.Style.Success,
        title: "providers.yaml backup restored",
      });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to restore backup",
        message: String(e),
      });
    }
  }, []);

  const setPresetIconForProvider = useCallback(
    async (providerId: string, presetId: string) => {
      const nextIcons = setProviderPresetIcon(
        providerIconsConfig,
        providerId,
        presetId,
      );

      const previous = getProviderIconRef(providerIconsConfig, providerId);
      await persistProviderIcons(nextIcons);
      if (
        previous?.type === "custom" &&
        !isCustomIconStillReferenced(nextIcons, previous.fileName)
      ) {
        removeCustomIconFile(previous.fileName);
      }
    },
    [persistProviderIcons, providerIconsConfig],
  );

  const uploadCustomIconForProvider = useCallback(
    async (providerId: string, sourcePath: string) => {
      const previous = getProviderIconRef(providerIconsConfig, providerId);
      const copiedFileName = copyCustomIconToSupport(providerId, sourcePath);
      const nextIcons = setProviderCustomIcon(
        providerIconsConfig,
        providerId,
        copiedFileName,
      );

      try {
        await persistProviderIcons(nextIcons);
      } catch (e) {
        removeCustomIconFile(copiedFileName);
        throw e;
      }

      if (
        previous?.type === "custom" &&
        previous.fileName !== copiedFileName &&
        !isCustomIconStillReferenced(nextIcons, previous.fileName)
      ) {
        removeCustomIconFile(previous.fileName);
      }
    },
    [persistProviderIcons, providerIconsConfig],
  );

  const resetProviderIconMapping = useCallback(
    async (providerId: string) => {
      const previous = getProviderIconRef(providerIconsConfig, providerId);
      if (!previous) {
        showToast({
          style: Toast.Style.Success,
          title: "Provider icon already default",
        });
        return;
      }

      const nextIcons = removeProviderIcon(providerIconsConfig, providerId);
      await persistProviderIcons(nextIcons);
      if (
        previous.type === "custom" &&
        !isCustomIconStillReferenced(nextIcons, previous.fileName)
      ) {
        removeCustomIconFile(previous.fileName);
      }
      showToast({
        style: Toast.Style.Success,
        title: "Provider icon reset",
      });
    },
    [persistProviderIcons, providerIconsConfig],
  );

  if (readError) {
    return (
      <List navigationTitle="AI Providers">
        <List.EmptyView
          title="Failed to Read providers.yaml"
          description={readError}
          actions={
            <ActionPanel>
              <Action
                title="Reload Providers.yaml"
                icon={Icon.RotateClockwise}
                onAction={reloadProvidersConfig}
              />
              <Action
                title="Open Providers.yaml Directory"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={openProvidersYamlPath}
              />
              <Action
                title="Restore Providers.yaml Backup"
                icon={Icon.RotateAntiClockwise}
                style={Action.Style.Destructive}
                onAction={restoreProvidersConfigBackup}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="AI Providers"
      searchBarPlaceholder="Search providers..."
    >
      {config.providers.length === 0 &&
      disabledConfig.providers.length === 0 ? (
        <List.EmptyView
          title="No Providers Found"
          description="Add a provider to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Provider"
                icon={Icon.Plus}
                target={
                  <ProviderForm
                    existingIds={allProviderIds}
                    onSave={(provider) =>
                      persistAll(
                        { providers: [...config.providers, provider] },
                        disabledConfig,
                      )
                    }
                  />
                }
              />
              <Action
                title="Open Providers.yaml Directory"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={openProvidersYamlPath}
              />
              <Action
                title="Restore Providers.yaml Backup"
                icon={Icon.RotateAntiClockwise}
                style={Action.Style.Destructive}
                onAction={restoreProvidersConfigBackup}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section
            title="Active Providers"
            subtitle={`${config.providers.length}`}
          >
            {config.providers.map((provider) => (
              <List.Item
                key={provider.id}
                icon={resolveProviderListIcon(provider, providerIconsConfig)}
                title={provider.name}
                subtitle={provider.base_url}
                accessories={[
                  { text: `${provider.models.length} models`, icon: Icon.Box },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Models"
                      icon={Icon.List}
                      target={
                        <ProviderDetail
                          provider={provider}
                          disabledModels={
                            disabledConfig.modelsByProvider[provider.id] || []
                          }
                          onDisableModel={(model) =>
                            disableModel(provider.id, model)
                          }
                          onEnableModel={(modelId) =>
                            enableModel(provider.id, modelId)
                          }
                          onUpdate={(updated) => {
                            const nextConfig = {
                              providers: config.providers.map((p) =>
                                p.id === updated.id ? updated : p,
                              ),
                            };
                            return persistAll(nextConfig, disabledConfig);
                          }}
                          onDelete={() => deleteProvider(provider.id)}
                        />
                      }
                    />
                    <Action.Push
                      title="Edit Provider"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      target={
                        <ProviderForm
                          provider={provider}
                          existingIds={allProviderIds.filter(
                            (id) => id !== provider.id,
                          )}
                          onSave={(updated) => {
                            const nextConfig = {
                              providers: config.providers.map((p) =>
                                p.id === provider.id ? updated : p,
                              ),
                            };
                            return persistAll(nextConfig, disabledConfig);
                          }}
                        />
                      }
                    />
                    <Action.Push
                      title="Add Provider"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={
                        <ProviderForm
                          existingIds={allProviderIds}
                          onSave={(newProvider) =>
                            persistAll(
                              { providers: [...config.providers, newProvider] },
                              disabledConfig,
                            )
                          }
                        />
                      }
                    />
                    <Action.Push
                      title="Choose Preset Icon"
                      icon={Icon.Swatch}
                      target={
                        <ProviderPresetIconList
                          provider={provider}
                          onSelectPreset={(presetId) =>
                            setPresetIconForProvider(provider.id, presetId)
                          }
                        />
                      }
                    />
                    <Action.Push
                      title="Upload Custom Icon"
                      icon={Icon.Upload}
                      target={
                        <UploadProviderIconForm
                          provider={provider}
                          onUpload={(sourcePath) =>
                            uploadCustomIconForProvider(provider.id, sourcePath)
                          }
                        />
                      }
                    />
                    <Action
                      title="Reset Provider Icon"
                      icon={Icon.RotateAntiClockwise}
                      onAction={() => resetProviderIconMapping(provider.id)}
                    />
                    <Action
                      title="Disable Provider"
                      icon={Icon.Pause}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => disableProvider(provider)}
                    />
                    <Action.Push
                      title="Duplicate Provider"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      target={(() => {
                        let newId = `${provider.id}-copy`;
                        let counter = 1;
                        while (allProviderIds.includes(newId)) {
                          newId = `${provider.id}-copy-${counter}`;
                          counter++;
                        }
                        const newProvider = {
                          ...provider,
                          id: newId,
                          name: `${provider.name} (Copy)`,
                        };

                        return (
                          <ProviderForm
                            provider={newProvider}
                            existingIds={allProviderIds}
                            isDuplicate
                            onSave={async (duplicatedProvider) => {
                              const saved = await persistAll(
                                {
                                  providers: [
                                    ...config.providers,
                                    duplicatedProvider,
                                  ],
                                },
                                disabledConfig,
                              );
                              if (!saved) return false;

                              const nextIcons = duplicateProviderIcon(
                                providerIconsConfig,
                                provider.id,
                                duplicatedProvider.id,
                              );
                              if (nextIcons !== providerIconsConfig) {
                                try {
                                  await persistProviderIcons(nextIcons);
                                } catch (e) {
                                  showToast({
                                    style: Toast.Style.Failure,
                                    title: "Provider duplicated without icon",
                                    message: String(e),
                                  });
                                }
                              }
                              return true;
                            }}
                          />
                        );
                      })()}
                    />
                    <Action
                      title="Delete Provider"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => deleteProvider(provider.id)}
                    />
                    <Action
                      title="Open Providers.yaml Directory"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={openProvidersYamlPath}
                    />
                    <Action
                      title="Restore Providers.yaml Backup"
                      icon={Icon.RotateAntiClockwise}
                      style={Action.Style.Destructive}
                      onAction={restoreProvidersConfigBackup}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section
            title="Disabled Providers"
            subtitle={`${disabledConfig.providers.length}`}
          >
            {disabledConfig.providers.map((provider) => (
              <List.Item
                key={`disabled-${provider.id}`}
                icon={resolveProviderListIcon(provider, providerIconsConfig)}
                title={provider.name}
                subtitle={provider.base_url}
                accessories={[{ tag: { value: "Disabled", color: "#999" } }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Enable Provider"
                      icon={Icon.Play}
                      onAction={() => enableProvider(provider.id)}
                    />
                    <Action.Push
                      title="Choose Preset Icon"
                      icon={Icon.Swatch}
                      target={
                        <ProviderPresetIconList
                          provider={provider}
                          onSelectPreset={(presetId) =>
                            setPresetIconForProvider(provider.id, presetId)
                          }
                        />
                      }
                    />
                    <Action.Push
                      title="Upload Custom Icon"
                      icon={Icon.Upload}
                      target={
                        <UploadProviderIconForm
                          provider={provider}
                          onUpload={(sourcePath) =>
                            uploadCustomIconForProvider(provider.id, sourcePath)
                          }
                        />
                      }
                    />
                    <Action
                      title="Reset Provider Icon"
                      icon={Icon.RotateAntiClockwise}
                      onAction={() => resetProviderIconMapping(provider.id)}
                    />
                    <Action
                      title="Delete Provider"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteProvider(provider.id)}
                    />
                    <Action
                      title="Open Providers.yaml Directory"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={openProvidersYamlPath}
                    />
                    <Action
                      title="Restore Providers.yaml Backup"
                      icon={Icon.RotateAntiClockwise}
                      style={Action.Style.Destructive}
                      onAction={restoreProvidersConfigBackup}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
