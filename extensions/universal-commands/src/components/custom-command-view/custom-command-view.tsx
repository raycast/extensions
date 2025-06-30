import {
  Action,
  ActionPanel,
  Application,
  confirmAlert,
  Form,
  getApplications,
  LocalStorage,
  popToRoot,
  showToast,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { useEffect, useState } from "react";
import { ShortcutPicker } from "../shortcut-picker";
import { CommandRecord, FormFields, IFormValues } from "../../types";
import { getAppShortcuts, getUrlShortcuts, isPredefinedCommand, validateFormValues } from "../../utils";
import { idToCommandMap } from "../../mock";

interface IProps {
  isEdit?: boolean;
  id?: string;
}

export const CustomCommandView = ({ isEdit, id }: IProps) => {
  const [installedApps, setInstalledApps] = useState<Application[]>([]);
  const [commandName, setCommandName] = useState<string>("");
  const [pickedApps, setPickedApps] = useState<string[]>([]);
  const [pickedUrls, setPickedUrls] = useState<string>("");
  const [pickedAppShortcuts, setPickedAppShortcuts] = useState<Record<string, string[]>>({});
  const [pickedUrlShortcuts, setPickedUrlShortcuts] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const installedAppsPromise = getApplications();
    installedAppsPromise.then((installedApps) => {
      setInstalledApps(installedApps);
    });

    if (isEdit && id) {
      const isPredefined = isPredefinedCommand(id);
      if (isPredefined) {
        confirmAlert({
          title: "Warning",
          message: "This is not editable and any changes will be reverted to defaults",
        });
      }

      LocalStorage.getItem(id).then((commandRaw) => {
        if (commandRaw || isPredefined) {
          const command: CommandRecord = isPredefined ? idToCommandMap[id] : JSON.parse(commandRaw as string);

          const apps: typeof pickedApps = [];
          const urls: (typeof pickedUrls)[] = [];
          const appShortcuts: typeof pickedAppShortcuts = {};
          const urlShortcuts: typeof pickedUrlShortcuts = {};

          command.shortcuts.forEach((shortcut) => {
            if (shortcut.type === "app") {
              apps.push(shortcut.applicationName);
              appShortcuts[shortcut.applicationName] = [
                ...shortcut.shortcutToRun.modifiers,
                shortcut.shortcutToRun.key,
              ];
            } else {
              urls.push(shortcut.websiteUrl);
              urlShortcuts[shortcut.websiteUrl] = [...shortcut.shortcutToRun.modifiers, shortcut.shortcutToRun.key];
            }
          });

          setCommandName(command.name);
          setPickedApps(apps);
          setPickedUrls(urls.join(" "));
          setPickedAppShortcuts(appShortcuts);
          setPickedUrlShortcuts(urlShortcuts);
        }
      });
    }
  }, []);

  const onCommandNameChangeHandler = (commandName: string) => {
    if (errors[FormFields.commandName] && !!commandName) {
      setErrors((prev) => ({ ...prev, commandName: undefined }));
    }

    setCommandName(commandName);
  };

  const onPickedAppsChangeHandler = (pickedApps: string[]) => {
    if ((errors[FormFields.apps] || errors[FormFields.urls]) && pickedApps.length !== 0) {
      setErrors((prev) => ({ ...prev, apps: undefined, urls: undefined }));
    }
    setPickedApps(pickedApps);
  };

  const onPickedUrlsChangeHandler = (pickedUrls: string) => {
    if ((errors[FormFields.apps] || errors[FormFields.urls]) && !!pickedUrls) {
      setErrors((prev) => ({ ...prev, apps: undefined, urls: undefined }));
    }

    setPickedUrls(pickedUrls);
  };

  const onAppShortcutChangeHandler = (app: string) => (shortcut: string[]) => {
    if (errors[app] && shortcut.length !== 0) {
      setErrors((prev) => ({ ...prev, [app]: undefined }));
    }

    setPickedAppShortcuts((prev) => ({ ...prev, [app]: shortcut }));
  };

  const onUrlShortcutChangeHandler = (url: string) => (shortcut: string[]) => {
    if (errors[url] && shortcut.length !== 0) {
      setErrors((prev) => ({ ...prev, [url]: undefined }));
    }

    setPickedUrlShortcuts((prev) => ({ ...prev, [url]: shortcut }));
  };

  const onFormSubmit = async (values: IFormValues) => {
    const validationErrors = validateFormValues(values);

    if (Object.keys(validationErrors).length !== 0) {
      setErrors(validationErrors);
      return;
    }

    const appShortcuts = getAppShortcuts(values);

    const urlShortcuts = getUrlShortcuts(values);

    if (id && isPredefinedCommand(id)) {
      popToRoot();
      return;
    }

    if (isEdit && id) {
      const command: CommandRecord = {
        id,
        name: values.commandName,
        shortcuts: [...appShortcuts, ...urlShortcuts],
        isPredefined: false,
      };

      await LocalStorage.setItem(id, JSON.stringify(command));
      showToast({ title: "Successfully updated" });
    } else {
      const command: CommandRecord = {
        id: randomUUID(),
        name: values.commandName,
        shortcuts: [...appShortcuts, ...urlShortcuts],
        isPredefined: false,
      };

      await LocalStorage.setItem(command.id, JSON.stringify(command));
      showToast({ title: "Successfully created" });
    }

    popToRoot();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onFormSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={FormFields.commandName}
        title="Command Name"
        placeholder="For example: Toggle Mute/Unmute"
        onChange={onCommandNameChangeHandler}
        value={commandName}
        error={errors[FormFields.commandName]}
      />
      <Form.TagPicker
        id={FormFields.apps}
        title="Applications"
        placeholder="Choose applications"
        onChange={onPickedAppsChangeHandler}
        value={pickedApps}
        error={errors[FormFields.apps]}
      >
        {installedApps.map((installedApp) => (
          <Form.TagPicker.Item key={installedApp.name} value={installedApp.name} title={installedApp.name} />
        ))}
      </Form.TagPicker>
      {pickedApps.map((pickedApp) => (
        <ShortcutPicker
          id={pickedApp}
          title={pickedApp}
          key={pickedApp}
          onChange={onAppShortcutChangeHandler(pickedApp)}
          value={pickedAppShortcuts[pickedApp] || []}
          error={errors[pickedApp]}
        />
      ))}
      <Form.TextField
        id={FormFields.urls}
        title="URLs of web applications"
        placeholder="https://meet.google.com https://example.com"
        info="URLs with protocol, space separated"
        onChange={onPickedUrlsChangeHandler}
        value={pickedUrls}
        error={errors[FormFields.urls]}
      />
      {pickedUrls
        .split(" ")
        .filter(Boolean)
        .map((pickedUrl) => (
          <ShortcutPicker
            id={pickedUrl}
            title={pickedUrl}
            key={pickedUrl}
            onChange={onUrlShortcutChangeHandler(pickedUrl)}
            value={pickedUrlShortcuts[pickedUrl] || []}
            error={errors[pickedUrl]}
          />
        ))}
    </Form>
  );
};
