import {
  Action,
  ActionPanel,
  Application,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  clearSearchBar,
  confirmAlert,
  getApplications,
  open,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { v4 as uuid } from "uuid";
import xorby from "lodash.xorby";
import { URL } from "url";

import { Preset, PresetNameFormValues } from "./types";

const CreateOrEditPresetName = (props: { name?: string; onCreateOrEditPresetName: (name: string) => void }) => {
  const [error, setError] = useState<string | undefined>(undefined);

  const handleOnCreateOrEditPresetName = (values: PresetNameFormValues) => {
    if (values.name === "") {
      return setError("Name is required");
    }

    props.onCreateOrEditPresetName(values.name);
  };

  const handleNameError = (value: string) => {
    if (!value?.length) {
      setError("Name is required");
    } else {
      setError(undefined);
    }
  };

  return (
    <Form
      navigationTitle="Create Preset: (2/2)"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" onSubmit={handleOnCreateOrEditPresetName} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={props.name}
        placeholder="My New Preset"
        autoFocus={true}
        error={error}
        onChange={(value) => handleNameError(value)}
        onBlur={(event) => handleNameError(event.target.value as string)}
      />
    </Form>
  );
};

const CreateOrEditPreset = (props: {
  preset?: Preset;
  onCreateOrEditPreset: (preset: Preset) => void;
  editing?: boolean;
}) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedApps, setSelectedApps] = useState<Application[]>([]);
  const [selectedURLs, setSelectedURLs] = useState<string[]>([]);

  const [hasSetApps, setHasSetApps] = useState(false);

  const { push, pop } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const installedApplications: Application[] = await getApplications();

        const appNameSort = (a: Application, b: Application) => a.name.localeCompare(b.name);

        setApps(installedApplications.sort(appNameSort));

        setHasSetApps(true);
      } catch (_) {
        showToast({
          title: "Error",
          message: "Could not load Apps",
          style: Toast.Style.Failure,
        });
      }

      // pre-load apps on 'edit'
      if (props.editing && props.preset?.apps?.length) {
        setSelectedApps(props.preset.apps);
      }

      // pre-load urls on 'edit'
      if (props.editing && props.preset?.urls?.length) {
        setSelectedURLs(props.preset.urls);
      }
    })();
  }, []);

  const toggleApp = (app: Application) => {
    setSelectedApps((selectedApps) => xorby(selectedApps, [app], "bundleId"));
  };

  const handleOnCreateOrEditPresetName = (name: string) => {
    props.onCreateOrEditPreset({
      ...props.preset,
      name,
      apps: selectedApps,
      urls: selectedURLs,
      new: !props.editing,
    });

    pop();
  };

  const appIsSelected = (app: Application) => {
    return selectedApps.map((selectedApp) => selectedApp.bundleId).includes(app.bundleId);
  };

  const maybeContinue = () => {
    if (selectedApps.length || selectedURLs.length) {
      push(
        <CreateOrEditPresetName name={props.preset?.name} onCreateOrEditPresetName={handleOnCreateOrEditPresetName} />
      );
    } else {
      showToast({ title: "At least 1 Application or URL Set required", style: Toast.Style.Failure });
    }
  };

  const ConfigureURLSet = (props: { urls: string[] }) => {
    const [urls, setUrls] = useState<string[]>([]);

    useEffect(() => {
      (async () => {
        if (props.urls && props.urls.length) {
          setUrls(props.urls);
        } else {
          setUrls([""]);
        }
      })();
    }, []);

    const validateURLSet = (values: object) => {
      const urls = Object.values(values);

      try {
        urls.forEach((url: string) => {
          new URL(url);
        });

        setSelectedURLs(urls);
        pop();
      } catch (e) {
        showToast({
          title: "One or more URLs are invalid. Please check.",
          style: Toast.Style.Failure,
        });
      }
    };

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save URL Set" onSubmit={validateURLSet} />
            <ActionPanel.Section title="URLs">
              <Action
                title="Add URL"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => setUrls((urls) => [...urls, ""])}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      >
        {urls.map((url, urlIndex) => (
          <Form.TextField key={urlIndex} id={`url-${urlIndex}`} title={`URL: #${urlIndex + 1}`} defaultValue={url} />
        ))}
      </Form>
    );
  };

  const ListItem = (app: Application) => {
    return (
      <List.Item
        key={app.bundleId}
        title={app.name}
        icon={{ fileIcon: app.path }}
        accessories={[{ icon: appIsSelected(app) ? Icon.Checkmark : undefined }]}
        actions={
          <ActionPanel>
            <Action
              title={`${appIsSelected(app) ? "Deselect" : "Select"} Application`}
              onAction={() => toggleApp(app)}
            />
            <Action
              title="Continue..."
              onAction={() => {
                clearSearchBar();
                maybeContinue();
              }}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={!hasSetApps} navigationTitle="Create Preset: (1/2)">
      <List.Section title="Special">
        <List.Item
          title={`URL Set ${selectedURLs.length ? `(${selectedURLs.length} URLs)` : ""}`}
          icon={Icon.Link}
          accessories={[{ icon: selectedURLs.length ? Icon.Checkmark : undefined }]}
          actions={
            <ActionPanel>
              <Action.Push title="Configure URL Set" target={<ConfigureURLSet urls={selectedURLs} />} />
              <Action
                title="Continue..."
                onAction={() => {
                  clearSearchBar();
                  maybeContinue();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Selected Applications">{selectedApps.map((app) => ListItem(app))}</List.Section>
      <List.Section title="All Applications">
        {apps
          .filter((app) => !selectedApps.map((selectedApp) => selectedApp.bundleId).includes(app.bundleId))
          .map((app) => ListItem(app))}
      </List.Section>
    </List>
  );
};

export default function Command() {
  const [appPresets, setAppPresets] = useState<Preset[]>([]);
  const [hasLoadedPresets, setHasLoadedPresets] = useState(false);

  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      const maybeAppPresets = await LocalStorage.getItem("xecutor");

      if (maybeAppPresets) {
        try {
          const appPresets = JSON.parse(maybeAppPresets as string);
          setAppPresets(appPresets);
        } catch (e) {
          // noop
        }
      }

      setHasLoadedPresets(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await LocalStorage.setItem("xecutor", JSON.stringify(appPresets));
    })();
  }, [appPresets]);

  const executePreset = async (preset: Preset) => {
    await Promise.all([
      ...preset.apps.map(async (app) => open(app.path)),
      ...preset.urls.map(async (url) => open(url)),
    ]);
  };

  const handleOnCreateOrEditPreset = (preset: Preset) => {
    if (preset.new) {
      setAppPresets((appPresets) => [
        ...appPresets,
        { id: uuid(), name: preset.name, apps: preset.apps, urls: preset.urls },
      ]);
    } else {
      setAppPresets((appPresets) =>
        appPresets.map((appPreset) => {
          return appPreset.id === preset.id
            ? { id: preset.id, name: preset.name, apps: preset.apps, urls: preset.urls }
            : appPreset;
        })
      );
    }

    pop();
  };

  const handleOnDeletePreset = async (preset: Preset) => {
    await confirmAlert({
      title: "Are you sure?",
      message: "This action is irreversible",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Delete",
        onAction: () => {
          setAppPresets((appPresets) =>
            appPresets.filter((appPreset) => {
              return appPreset.id !== preset.id;
            })
          );
          showToast({
            title: `Deleted preset: ${preset.name}`,
          });
        },
      },
    });
  };

  const countPluralizer = (items: Application[] | string[], singular: string, plural: string) => {
    return items.length === 1 ? `${singular}` : `${plural}`;
  };

  return (
    <List
      isLoading={!hasLoadedPresets}
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Preset"
            icon={Icon.NewDocument}
            target={<CreateOrEditPreset onCreateOrEditPreset={handleOnCreateOrEditPreset} />}
            onPush={clearSearchBar}
          />
        </ActionPanel>
      }
    >
      {appPresets.map((preset) => (
        <List.Item
          key={preset.id}
          title={preset.name}
          icon={{ source: { light: "xecutor.png", dark: "xecutor@dark.png" } }}
          accessories={[
            { icon: Icon.Link, text: `x${preset.urls.length}` },
            { icon: Icon.Window, text: `x${preset.apps.length}` },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="URLs" />
                  {preset.urls.length ? (
                    preset.urls.map((url) => <List.Item.Detail.Metadata.Label title={url} />)
                  ) : (
                    <List.Item.Detail.Metadata.Label title="None" />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Apps" />
                  {preset.apps.map((app) => (
                    <List.Item.Detail.Metadata.Label title={app.name} icon={{ fileIcon: app.path }} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Execute Preset"
                icon={Icon.Play}
                onAction={() => {
                  executePreset(preset);
                  showHUD(
                    `${preset.apps.length} ${countPluralizer(preset.apps, "App", "Apps")}, ${
                      preset.urls.length
                    } ${countPluralizer(preset.apps, "URL", "URLs")} Launched via Preset: ${preset.name}`
                  );
                }}
              />
              <Action.Push
                title="Edit Preset"
                icon={Icon.Pencil}
                target={
                  <CreateOrEditPreset
                    preset={preset}
                    editing={true}
                    onCreateOrEditPreset={handleOnCreateOrEditPreset}
                  />
                }
              />
              <Action
                title="Toggle Details"
                icon={Icon.AppWindowSidebarRight}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              <Action.Push
                title="Create Preset"
                icon={Icon.NewDocument}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateOrEditPreset onCreateOrEditPreset={handleOnCreateOrEditPreset} />}
                onPush={clearSearchBar}
              />
              <Action
                title="Delete Preset"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleOnDeletePreset(preset)}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No Presets" />
    </List>
  );
}
