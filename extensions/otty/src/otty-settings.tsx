import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import configDocs from "./lib/config-docs.json";
import { applySetting, getConfigPath, loadConfigDocs, loadSettings, loadThemeState } from "./lib/otty-config";
import { buildConfigSetArgs, buildConfigUnsetArgs } from "./lib/otty-core";
import {
  choicesFor,
  colorSwatch,
  CONFIG_REFERENCE_URL,
  formatValue,
  groupByDocs,
  groupSettings,
  validateEdit,
  type Setting,
  type SettingDoc,
} from "./lib/settings";
import { THEME_KEYS } from "./lib/themes";
import {
  LoadFailureView,
  RefreshAction,
  shiftShortcut,
  ToggleSidebarAction,
  usePersistentState,
  useRefreshFailureToast,
} from "./lib/ui";

const THEME_SETTING_KEYS = new Set(Object.values(THEME_KEYS));

/** Snapshot of Otty's configuration reference, refreshed by `npm run publish`. */
const CONFIG_DOCS_SNAPSHOT = configDocs as {
  docsVersion: string;
  settings: Record<string, SettingDoc>;
};
const ALL_GROUPS = "all";

export default function Command() {
  const [group, setGroup] = useState(ALL_GROUPS);
  const [onlyCustomized, setOnlyCustomized] = usePersistentState("settings-only-customized", false);
  const [showDetail, setShowDetail] = usePersistentState("show-detail-settings", true);
  const { data, isLoading, error, revalidate } = useCachedPromise(loadSettings, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  useRefreshFailureToast(error, Boolean(data), "Could not refresh Otty settings");
  const { data: liveDocs } = useCachedPromise(loadConfigDocs, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  const docRecord = liveDocs ?? CONFIG_DOCS_SNAPSHOT.settings;
  const { data: configPath } = useCachedPromise(getConfigPath, [], {
    onError: () => {},
  });

  const docs = useMemo(() => new Map(Object.entries(docRecord)), [docRecord]);
  const groupFor = (settings: Setting[]) => (docs.size > 0 ? groupByDocs(settings, docs) : groupSettings(settings));

  const allGroups = useMemo(() => groupFor(data ?? []), [data, docs]);
  const activeGroup = allGroups.some((g) => g.title === group) ? group : ALL_GROUPS;
  const groups = useMemo(
    () =>
      groupFor((data ?? []).filter((setting) => !onlyCustomized || setting.customized)).filter(
        (g) => activeGroup === ALL_GROUPS || g.title === activeGroup,
      ),
    [data, docs, onlyCustomized, activeGroup],
  );
  const toggleCustomized = () => setOnlyCustomized((value) => !value);
  const toggleDetail = () => setShowDetail((value) => !value);

  if (error && !data) {
    return (
      <List>
        <LoadFailureView title="Could Not Read Otty Settings" error={error} onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={groups.length > 0 && showDetail}
      searchBarPlaceholder={onlyCustomized ? "Search customized settings" : "Search settings"}
      searchBarAccessory={
        <List.Dropdown id="settings-group" tooltip="Group" storeValue onChange={setGroup}>
          <List.Dropdown.Item title="All Groups" value={ALL_GROUPS} />
          <List.Dropdown.Section>
            {allGroups.map(({ title }) => (
              <List.Dropdown.Item key={title} title={title} value={title} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Gear}
        title={onlyCustomized ? "No Customized Settings" : "No Matching Settings"}
        description={
          onlyCustomized ? "Nothing here differs from Otty's defaults." : "Try a different key, such as font or cursor."
        }
        actions={
          onlyCustomized ? (
            <ActionPanel>
              <Action title="Show All Settings" icon={Icon.Filter} onAction={toggleCustomized} />
            </ActionPanel>
          ) : undefined
        }
      />
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.settings.map((setting) => (
            <SettingItem
              key={setting.key}
              setting={setting}
              doc={docs.get(setting.key)}
              configPath={configPath}
              showDetail={showDetail}
              onToggleDetail={toggleDetail}
              onlyCustomized={onlyCustomized}
              onToggleCustomized={toggleCustomized}
              onChange={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SettingItem({
  setting,
  doc,
  configPath,
  showDetail,
  onToggleDetail,
  onlyCustomized,
  onToggleCustomized,
  onChange,
}: {
  setting: Setting;
  doc?: SettingDoc;
  configPath?: string;
  showDetail: boolean;
  onToggleDetail: () => void;
  onlyCustomized: boolean;
  onToggleCustomized: () => void;
  onChange: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (setting.customized) {
    accessories.push({ icon: Icon.Pencil, tooltip: "Set in your config" });
  }
  accessories.push(
    setting.type === "boolean"
      ? {
          tag: {
            value: formatValue(setting.value),
            color: setting.value ? Color.Green : Color.SecondaryText,
          },
        }
      : { text: formatValue(setting.value), tooltip: setting.text, icon: swatchIcon(setting.text) },
  );

  return (
    <List.Item
      title={setting.key}
      keywords={[...setting.key.split("-"), ...(doc ? [doc.section] : [])]}
      accessories={showDetail ? undefined : accessories}
      detail={showDetail ? <SettingDetail setting={setting} doc={doc} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {setting.type === "boolean" ? (
              <Action
                title={setting.value ? "Turn off" : "Turn on"}
                icon={setting.value ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={() =>
                  apply(
                    buildConfigSetArgs(setting.key, String(!setting.value)),
                    `Turned ${setting.value ? "off" : "on"} ${setting.key}`,
                    onChange,
                  )
                }
              />
            ) : setting.type === "object" ? null : (
              <Action.Push
                title="Edit Value"
                icon={Icon.Pencil}
                target={<EditSettingForm setting={setting} doc={doc} onSaved={onChange} />}
              />
            )}
            {setting.customized ? (
              <Action
                title="Reset to Default"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => resetSetting(setting, doc, onChange)}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Value"
              content={setting.text}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Key"
              content={setting.key}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Config">
            {configPath ? (
              <Action.Open
                title="Open Config File"
                icon={Icon.Document}
                target={configPath}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            ) : null}
            <Action.OpenInBrowser title="Open Configuration Reference" url={`${CONFIG_REFERENCE_URL}#${setting.key}`} />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <ToggleSidebarAction showDetail={showDetail} onToggle={onToggleDetail} />
            <Action
              title={onlyCustomized ? "Show All Settings" : "Show Only Customized"}
              icon={Icon.Filter}
              shortcut={shiftShortcut("f")}
              onAction={onToggleCustomized}
            />
            <RefreshAction onRefresh={onChange} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function swatchIcon(text: string | undefined): Image.ImageLike | undefined {
  const color = colorSwatch(text);
  return color ? { source: Icon.CircleFilled, tintColor: color } : undefined;
}

function SettingDetail({ setting, doc }: { setting: Setting; doc?: SettingDoc }) {
  return (
    <List.Item.Detail
      markdown={`## ${setting.key}\n\n${doc?.description ?? "*Not in Otty's configuration reference.*"}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Current"
            text={formatValue(setting.value)}
            icon={
              swatchIcon(setting.text) ??
              (setting.customized ? { source: Icon.Pencil, tintColor: Color.SecondaryText } : undefined)
            }
          />
          {doc ? (
            <List.Item.Detail.Metadata.Label title="Default" text={doc.default} icon={swatchIcon(doc.default)} />
          ) : null}
          {doc?.values ? (
            <List.Item.Detail.Metadata.TagList title="Allowed Values">
              {doc.values.map((value) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={value}
                  text={value}
                  color={value === setting.text ? Color.Green : undefined}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {doc ? (
            <>
              <List.Item.Detail.Metadata.Label title="Type" text={doc.type} />
              <List.Item.Detail.Metadata.Label title="Section" text={doc.section} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function EditSettingForm({ setting, doc, onSaved }: { setting: Setting; doc?: SettingDoc; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [valueError, setValueError] = useState<string>();
  const isTheme = THEME_SETTING_KEYS.has(setting.key);
  const choices = choicesFor(setting, doc);
  const { data: themeState, isLoading } = useCachedPromise(loadThemeState, [], {
    execute: isTheme,
    onError: () => {},
  });
  const themes = themeState?.themes.map((theme) => theme.name);

  async function save(values: { value: string }) {
    const value = values.value.trim();
    const invalid = validateEdit(value, setting, doc, isTheme ? { names: themes } : undefined);
    if (invalid) {
      setValueError(invalid);
      return;
    }
    const args = value ? buildConfigSetArgs(setting.key, value) : buildConfigUnsetArgs(setting.key);
    if (await apply(args, `Updated ${setting.key}`, onSaved)) pop();
  }

  const defaultLabel = `Otty's Default${doc?.default ? ` (${doc.default})` : ""}`;
  const errorProps = { error: valueError, onChange: () => setValueError(undefined) };

  return (
    <Form
      navigationTitle={setting.key}
      isLoading={isTheme && isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={save} />
          <Action.OpenInBrowser title="Open Configuration Reference" url={`${CONFIG_REFERENCE_URL}#${setting.key}`} />
        </ActionPanel>
      }
    >
      {isTheme && themes ? (
        <Form.Dropdown id="value" title="Theme" defaultValue={setting.text} {...errorProps}>
          {themes.map((name) => (
            <Form.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </Form.Dropdown>
      ) : choices ? (
        <Form.Dropdown
          id="value"
          title="Value"
          defaultValue={setting.customized ? setting.text : ""}
          info={doc?.description}
          {...errorProps}
        >
          <Form.Dropdown.Item title={defaultLabel} value="" />
          <Form.Dropdown.Section>
            {choices.map((value) => (
              <Form.Dropdown.Item key={value} title={value} value={value} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : setting.type === "list" ? (
        <Form.TextArea
          id="value"
          title="Entries"
          defaultValue={setting.text}
          info={doc?.description ?? "One entry per line."}
        />
      ) : (
        <Form.TextField id="value" title="Value" defaultValue={setting.text} info={doc?.description} {...errorProps} />
      )}
      {choices ? null : <Form.Description text="Leave it empty to go back to Otty's default." />}
    </Form>
  );
}

function apply(args: string[], successTitle: string, onChange: () => void): Promise<boolean> {
  return applySetting(args, { title: successTitle }, "Could not change setting", onChange);
}

async function resetSetting(setting: Setting, doc: SettingDoc | undefined, onChange: () => void) {
  const confirmed = await confirmAlert({
    title: `Reset ${setting.key}?`,
    message: doc?.default ? `It goes back to Otty's default, ${doc.default}.` : "It goes back to Otty's default.",
    primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
  });
  if (confirmed) {
    await apply(buildConfigUnsetArgs(setting.key), `Reset ${setting.key}`, onChange);
  }
}
