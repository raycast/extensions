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
import { OttyTooOldError, showFailure } from "./lib/otty";
import { applySetting, getConfigPath, loadResetKeys, loadSettings, loadThemeState } from "./lib/otty-config";
import { buildConfigSetArgs, buildConfigUnsetArgs } from "./lib/otty-core";
import {
  choicesFor,
  colorSwatch,
  CONFIG_REFERENCE_URL,
  defaultText,
  displayValue,
  ALL_SETTINGS,
  CUSTOMIZED_SETTINGS,
  groupSettings,
  groupTitle,
  paneIcon,
  settingsForView,
  validateEdit,
  type Setting,
  editedValue,
} from "./lib/settings";
import { applyTheme } from "./lib/theme-change";
import { THEME_KEYS, type ThemeMode } from "./lib/themes";
import {
  LoadFailureView,
  RefreshAction,
  shiftShortcut,
  ToggleSidebarAction,
  usePersistentState,
  useRefreshFailureToast,
} from "./lib/ui";

const THEME_SETTING_KEYS = new Set<string>(Object.values(THEME_KEYS));

function themeSlot(key: string): ThemeMode | undefined {
  return (Object.keys(THEME_KEYS) as ThemeMode[]).find((mode) => THEME_KEYS[mode] === key);
}

export default function Command() {
  // One filter: All Settings, Customized, or a pane. Choosing a pane shows all of its settings.
  const [view, setView] = usePersistentState<string>("settings-view", ALL_SETTINGS);
  const [showDetail, setShowDetail] = usePersistentState("show-detail-settings", true);
  const { data, isLoading, error, revalidate } = useCachedPromise(loadSettings, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  // An old Otty gets the full Update Otty view below, not a toast over rows that are no longer shown.
  useRefreshFailureToast(
    error,
    Boolean(data) && !(error instanceof OttyTooOldError),
    "Could not refresh Otty settings",
  );
  const { data: configPath } = useCachedPromise(getConfigPath, [], {
    onError: () => {},
  });

  // The dropdown filters by Otty's Settings pane; each pane's sections stay separate list sections.
  const panes = useMemo(() => [...new Set(groupSettings(data ?? []).map((g) => g.pane))], [data]);
  // A stored pane Otty no longer has falls back to All Settings.
  const activeView = view === CUSTOMIZED_SETTINGS || panes.includes(view) ? view : ALL_SETTINGS;
  const onlyCustomized = activeView === CUSTOMIZED_SETTINGS;
  const groups = useMemo(() => settingsForView(data ?? [], activeView), [data, activeView]);
  const toggleCustomized = () => setView(onlyCustomized ? ALL_SETTINGS : CUSTOMIZED_SETTINGS);
  const toggleDetail = () => setShowDetail((value) => !value);

  // Cached rows would hide why nothing refreshes: an old Otty always gets the Update Otty view.
  if (error && (!data || error instanceof OttyTooOldError)) {
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
        <List.Dropdown id="settings-view" tooltip="Show" value={activeView} onChange={setView}>
          <List.Dropdown.Item title="All Settings" value={ALL_SETTINGS} icon={Icon.List} />
          <List.Dropdown.Item title="Customized" value={CUSTOMIZED_SETTINGS} icon={Icon.Pencil} />
          <List.Dropdown.Section>
            {panes.map((pane) => (
              <List.Dropdown.Item key={pane} title={pane} value={pane} icon={paneImage(pane)} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Gear}
        title={onlyCustomized ? "No Customized Settings" : "No Matching Settings"}
        description={
          onlyCustomized
            ? "Nothing here differs from Otty's defaults."
            : "Try a different name or key, such as font or cursor."
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
  configPath,
  showDetail,
  onToggleDetail,
  onlyCustomized,
  onToggleCustomized,
  onChange,
}: {
  setting: Setting;
  configPath?: string;
  showDetail: boolean;
  onToggleDetail: () => void;
  onlyCustomized: boolean;
  onToggleCustomized: () => void;
  onChange: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (setting.schema.deprecated) {
    accessories.push({ tag: { value: "Deprecated", color: Color.Orange } });
  }
  if (setting.customized) {
    accessories.push({ icon: Icon.Pencil, tooltip: "Set in your config" });
  }
  accessories.push(
    isBoolean(setting)
      ? {
          tag: {
            value: displayValue(setting),
            color: setting.value ? Color.Green : Color.SecondaryText,
          },
        }
      : { text: displayValue(setting), tooltip: setting.text, icon: swatchIcon(setting.text) },
  );

  return (
    <List.Item
      icon={paneImage(setting.schema.settings?.pane ?? "")}
      title={setting.label}
      subtitle={showDetail || setting.label === setting.key ? undefined : setting.key}
      keywords={[setting.key, ...setting.key.split("-"), groupTitle(setting.schema)]}
      accessories={showDetail ? undefined : accessories}
      detail={showDetail ? <SettingDetail setting={setting} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isBoolean(setting) ? (
              <Action
                title={setting.value ? "Turn off" : "Turn on"}
                icon={setting.value ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={() =>
                  apply(
                    buildConfigSetArgs(setting.key, String(!setting.value)),
                    `Turned ${setting.value ? "off" : "on"} ${setting.label}`,
                    onChange,
                  )
                }
              />
            ) : (
              <Action.Push
                title="Edit Value"
                icon={Icon.Pencil}
                target={<EditSettingForm setting={setting} onSaved={onChange} />}
              />
            )}
            {setting.customized ? (
              <Action
                title="Reset to Default"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => resetSetting(setting, onChange)}
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

/** A bool always reads true or false in `config show`; the schema says so even when a value is missing. */
function isBoolean(setting: Setting): boolean {
  return setting.schema.type === "bool" && typeof setting.value === "boolean";
}

function swatchIcon(text: string | undefined): Image.ImageLike | undefined {
  const color = colorSwatch(text);
  return color ? { source: Icon.CircleFilled, tintColor: color } : undefined;
}

function rangeText({ min, max }: Setting["schema"]): string | undefined {
  if (typeof min === "number" && typeof max === "number") return `${min} to ${max}`;
  if (typeof min === "number") return `At least ${min}`;
  if (typeof max === "number") return `Up to ${max}`;
  return undefined;
}

function SettingDetail({ setting }: { setting: Setting }) {
  const { schema } = setting;
  const range = rangeText(schema);
  const allowed = schema.values ?? schema.suggestions;
  return (
    <List.Item.Detail
      markdown={`## ${setting.label}\n\n\`${setting.key}\`\n\n${schema.description}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Current"
            text={displayValue(setting)}
            icon={
              swatchIcon(setting.text) ??
              (setting.customized ? { source: Icon.Pencil, tintColor: Color.SecondaryText } : undefined)
            }
          />
          <List.Item.Detail.Metadata.Label
            title="Default"
            text={defaultText(schema)}
            icon={swatchIcon(typeof schema.default === "string" ? schema.default : undefined)}
          />
          {allowed?.length ? (
            <List.Item.Detail.Metadata.TagList title={schema.values ? "Allowed Values" : "Suggestions"}>
              {allowed.map((value) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={value}
                  text={value}
                  color={value === setting.text ? Color.Green : undefined}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {schema.format ? <List.Item.Detail.Metadata.Label title="Format" text={schema.format} /> : null}
          {range ? <List.Item.Detail.Metadata.Label title="Range" text={range} /> : null}
          <List.Item.Detail.Metadata.Label title="Type" text={schema.type} />
          <List.Item.Detail.Metadata.Label title="Settings Pane" text={groupTitle(schema)} />
          {schema.aliasOf ? <List.Item.Detail.Metadata.Label title="Alias Of" text={schema.aliasOf} /> : null}
          {schema.deprecated ? <List.Item.Detail.Metadata.Label title="Status" text="Deprecated" /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function fieldInfo({ schema }: Setting): string {
  const parts = [schema.description];
  if (schema.format) parts.push(`Format: ${schema.format}`);
  if (schema.type === "enum-list" && schema.values) parts.push(`Any of: ${schema.values.join(", ")}`);
  if (schema.allowsOther && schema.values) parts.push(`One of ${schema.values.join(", ")}, or your own value`);
  if (schema.suggestions) parts.push(`Suggestions: ${schema.suggestions.join(", ")}`);
  const range = rangeText(schema);
  if (range) parts.push(`Range: ${range}`);
  return parts.join("\n\n");
}

function EditSettingForm({ setting, onSaved }: { setting: Setting; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [valueError, setValueError] = useState<string>();
  const isTheme = THEME_SETTING_KEYS.has(setting.key);
  const choices = choicesFor(setting);
  const { data: themeState, isLoading } = useCachedPromise(loadThemeState, [], {
    execute: isTheme,
    onError: () => {},
  });
  // The current theme is always offered, even when the catalog doesn't list it, so saving can keep it.
  const catalog = themeState?.themes.map((theme) => theme.name);
  const themes = catalog && setting.text && !catalog.includes(setting.text) ? [setting.text, ...catalog] : catalog;

  async function save(values: { value: string }) {
    const value = editedValue(values.value, setting.schema);
    const invalid = validateEdit(value, setting, isTheme ? { names: themes } : undefined);
    if (invalid) {
      setValueError(invalid);
      return;
    }
    // A theme goes through the same override check as Change Otty Theme, so colors set in the config can't hide it silently.
    const slot = themeSlot(setting.key);
    if (slot && value) {
      if (await applyTheme(value, slot, onSaved)) pop();
      return;
    }
    if (value) {
      if (await apply(buildConfigSetArgs(setting.key, value), `Updated ${setting.label}`, onSaved)) pop();
    } else if (await resetToDefault(setting, `Updated ${setting.label}`, onSaved)) {
      pop();
    }
  }

  const defaultValue = defaultText(setting.schema);
  const defaultLabel = defaultValue === "Not set" ? "Otty's Default" : `Otty's Default (${defaultValue})`;
  const errorProps = { error: valueError, onChange: () => setValueError(undefined) };
  const info = fieldInfo(setting);

  return (
    <Form
      navigationTitle={setting.label}
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
          title={setting.label}
          defaultValue={setting.customized ? setting.text : ""}
          info={info}
          {...errorProps}
        >
          <Form.Dropdown.Item title={defaultLabel} value="" />
          <Form.Dropdown.Section>
            {choices.map((value) => (
              <Form.Dropdown.Item key={value} title={value} value={value} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : setting.schema.type === "list" ? (
        <Form.TextArea
          id="value"
          title={setting.label}
          defaultValue={setting.text}
          placeholder={setting.schema.format ?? undefined}
          info={`${info}\n\nOne entry per line.`}
        />
      ) : (
        <Form.TextField
          id="value"
          title={setting.label}
          defaultValue={setting.text}
          placeholder={setting.schema.format ?? undefined}
          info={info}
          {...errorProps}
        />
      )}
      {choices ? null : <Form.Description text="Leave it empty to go back to Otty's default." />}
    </Form>
  );
}

function apply(args: string[], successTitle: string, onChange: () => void): Promise<boolean> {
  return applySetting(args, { title: successTitle }, "Could not change setting", onChange);
}

async function resetSetting(setting: Setting, onChange: () => void) {
  const confirmed = await confirmAlert({
    title: `Reset ${setting.label}?`,
    message: `It goes back to Otty's default, ${defaultText(setting.schema)}.`,
    primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
  });
  if (confirmed) {
    await resetToDefault(setting, `Reset ${setting.label}`, onChange);
  }
}

/** Otty's own sidebar icon for a Settings pane, tinted to match the theme; Other has none of its own. */
function paneImage(pane: string): Image.ImageLike {
  const source = paneIcon(pane);
  return source ? { source, tintColor: Color.PrimaryText } : Icon.Ellipsis;
}

/** Unsets every key the row stands for, read now rather than from the loaded rows (`loadResetKeys`). */
async function resetToDefault(setting: Setting, successTitle: string, onChange: () => void): Promise<boolean> {
  let keys: string[];
  try {
    keys = await loadResetKeys(setting.key);
  } catch (error) {
    await showFailure("Could not read your Otty config", error);
    return false;
  }
  return apply(buildConfigUnsetArgs(...keys), successTitle, onChange);
}
