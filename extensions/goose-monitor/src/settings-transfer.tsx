import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { useMessages } from "./locale";
import { defaultSort } from "./lib/categories";
import { formatTransferError } from "./lib/i18n";
import {
  parseSettingsTransfer,
  serializeSettingsTransfer,
  TRANSFER_KEYS,
  type PortableSettings,
} from "./lib/settings-transfer";

type Props = {
  sharedPath: string;
  sharedStatus: string;
  preferencePath: string;
  overridePath: string;
  pathMode: "preference" | "override";
  onUsePreference: () => void;
  onUseOverride: () => void;
  onSelectOverride: (path: string) => Promise<void>;
  onCreateAt: (path: string) => Promise<void>;
  onImport: (settings: PortableSettings) => void;
  onCreate: () => Promise<void>;
  onApplyLocal: () => Promise<void>;
};

const readSort = async (key: string, category: PortableSettings["category"]) => {
  const raw = await LocalStorage.getItem<string>(key);
  try {
    return raw ? (JSON.parse(raw) as PortableSettings["sort"]) : defaultSort(category);
  } catch {
    return defaultSort(category);
  }
};

export default function SettingsTransfer({
  sharedPath,
  sharedStatus,
  preferencePath,
  overridePath,
  pathMode,
  onUsePreference,
  onUseOverride,
  onSelectOverride,
  onCreateAt,
  onImport,
  onCreate,
  onApplyLocal,
}: Props) {
  const t = useMessages();
  return (
    <List navigationTitle={t.settingsTransfer}>
      <List.Item
        title={t.exportSettings}
        subtitle={t.exportHint}
        icon={Icon.Upload}
        actions={
          <ActionPanel>
            <Action
              title={t.copySettings}
              onAction={async () => {
                try {
                  const rawCategory = await LocalStorage.getItem<string>(TRANSFER_KEYS.category);
                  const category = rawCategory ? (JSON.parse(rawCategory) as PortableSettings["category"]) : "all";
                  const settings = {
                    category,
                    sort: await readSort(TRANSFER_KEYS.sort, category),
                    networkSort: await readSort(TRANSFER_KEYS.networkSort, "net"),
                  };
                  const json = serializeSettingsTransfer(settings);
                  parseSettingsTransfer(json);
                  await Clipboard.copy(json);
                  await showToast({ style: Toast.Style.Success, title: t.copiedSettings });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t.exportFailed,
                    message: formatTransferError(error, t),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={t.importClipboard}
        subtitle={t.importHint}
        icon={Icon.Download}
        actions={
          <ActionPanel>
            <Action
              title={t.importSettings}
              icon={Icon.Download}
              onAction={async () => {
                try {
                  const clipboard = await Clipboard.readText();
                  if (!clipboard) throw new Error(t.emptyClipboard);
                  const settings = parseSettingsTransfer(clipboard);
                  await LocalStorage.setItem(TRANSFER_KEYS.category, JSON.stringify(settings.category));
                  await LocalStorage.setItem(TRANSFER_KEYS.sort, JSON.stringify(settings.sort));
                  await LocalStorage.setItem(TRANSFER_KEYS.networkSort, JSON.stringify(settings.networkSort));
                  onImport(settings);
                  await showToast({ style: Toast.Style.Success, title: t.importDone, message: t.reopenToApply });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t.importFailed,
                    message: formatTransferError(error, t),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={t.sharedJson}
        subtitle={`${t.currentSource}: ${pathMode === "preference" ? t.preferenceFile : t.overrideFile} (${t.switchHint})\n${t.preference}: ${preferencePath || t.notSelected}\n${t.override}: ${overridePath || t.notSelected}\n${t.pathHint}\n${sharedStatus}`}
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action.Push
              title={t.selectExisting}
              icon={Icon.Document}
              target={<ExistingFileForm onSelect={onSelectOverride} />}
            />
            <Action.Push title={t.createAtLocation} icon={Icon.Plus} target={<NewFileForm onCreate={onCreateAt} />} />
            <Action
              title={t.usePreference}
              icon={pathMode === "preference" ? Icon.CheckCircle : Icon.Gear}
              onAction={onUsePreference}
            />
            {overridePath ? (
              <Action
                title={t.useOverride}
                icon={pathMode === "override" ? Icon.CheckCircle : Icon.Document}
                onAction={onUseOverride}
              />
            ) : null}
            {sharedPath ? (
              <>
                <Action
                  title={t.createIfAbsent}
                  icon={Icon.Plus}
                  onAction={async () => {
                    try {
                      await onCreate();
                      await showToast({ style: Toast.Style.Success, title: t.sharedCreated });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: t.createFailed,
                        message: formatTransferError(error, t),
                      });
                    }
                  }}
                />
                <Action
                  title={t.applyLocal}
                  icon={Icon.Upload}
                  onAction={async () => {
                    try {
                      await onApplyLocal();
                      await showToast({ style: Toast.Style.Success, title: t.sharedUpdated });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: t.notWritten,
                        message: formatTransferError(error, t),
                      });
                    }
                  }}
                />
              </>
            ) : (
              <Action title={t.configureShared} icon={Icon.Gear} onAction={openExtensionPreferences} />
            )}
          </ActionPanel>
        }
      />
      <List.Item
        title={t.extensionPreferences}
        subtitle={t.preferencesHint}
        icon={Icon.Gear}
        actions={
          <ActionPanel>
            <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ExistingFileForm({ onSelect }: { onSelect: (path: string) => Promise<void> }) {
  const t = useMessages();
  return (
    <Form
      navigationTitle={t.selectSharedFile}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.useSelected}
            onSubmit={async (values) => {
              const selected = values.file?.[0];
              if (!selected || !selected.toLowerCase().endsWith(".json")) {
                await showToast({ style: Toast.Style.Failure, title: t.selectJson });
                return;
              }
              try {
                await onSelect(selected);
                await showToast({ style: Toast.Style.Success, title: t.switchedOverride });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t.selectionFailed,
                  message: formatTransferError(error, t),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title={t.jsonFile}
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}

function NewFileForm({ onCreate }: { onCreate: (path: string) => Promise<void> }) {
  const t = useMessages();
  return (
    <Form
      navigationTitle={t.chooseFolder}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.createShared}
            onSubmit={async (values) => {
              const directory = values.directory?.[0];
              const name = values.filename?.trim();
              if (!directory || !name || path.basename(name) !== name || !name.toLowerCase().endsWith(".json")) {
                await showToast({ style: Toast.Style.Failure, title: t.enterJsonName });
                return;
              }
              try {
                await onCreate(path.join(directory, name));
                await showToast({ style: Toast.Style.Success, title: t.sharedCreated });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t.notCreated,
                  message: formatTransferError(error, t),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title={t.newFileFolder}
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
      />
      <Form.TextField id="filename" title={t.newFileName} defaultValue="goose-monitor-settings.json" />
    </Form>
  );
}
