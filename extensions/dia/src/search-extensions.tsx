import { Action, ActionPanel, closeMainWindow, Color, getPreferenceValues, Icon, List, open } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import {
  clickExtensionMenuItem,
  getExtensionProfiles,
  openURLInProfile,
  type BrowserExtension,
  type ExtensionProfile,
} from "./extensions";
import { getSpaceTint, truncateSpaceName } from "./utils";

const ALL_PROFILES = "all";
/** Prefix for a profile's dropdown value, so a profile named "all" can't collide with All Profiles. */
const PROFILE_PREFIX = "profile:";
const ACCESSIBILITY_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

const settingsUrl = (extension: BrowserExtension) => `chrome://extensions/?id=${extension.id}`;

async function run(action: () => Promise<unknown>, failureTitle: string) {
  try {
    await closeMainWindow();
    await action();
  } catch (error) {
    const needsAccessibility = /assistive access|-1719|-25211/.test(String(error));
    await showFailureToast(error, {
      title: needsAccessibility ? "Raycast needs Accessibility access" : failureTitle,
      primaryAction: needsAccessibility
        ? { title: "Open Accessibility Settings", onAction: () => open(ACCESSIBILITY_SETTINGS_URL) }
        : undefined,
    });
  }
}

/** Picks the extension from Dia's Extensions menu, else opens its popup, else its settings page, in a tab. */
async function openExtension(extension: BrowserExtension, profile: ExtensionProfile) {
  if (await clickExtensionMenuItem(extension.name, profile.name)) return;
  await openURLInProfile(extension.popupUrl ?? settingsUrl(extension), profile.name);
}

function ExtensionItem({ extension, profile }: { extension: BrowserExtension; profile: ExtensionProfile }) {
  const { popupUrl } = extension;
  const failureTitle = `Could not open ${extension.name}`;
  const openInTab = (url: string) => run(() => openURLInProfile(url, profile.name), failureTitle);
  const accessories: List.Item.Accessory[] = [];
  if (!extension.enabled) accessories.push({ tag: { value: "Disabled", color: Color.SecondaryText } });
  if (extension.pinned) accessories.push({ icon: Icon.Tack, tooltip: "Pinned to toolbar" });
  accessories.push({
    tag: { value: truncateSpaceName(profile.name), color: getSpaceTint(profile.color) },
    tooltip: profile.name,
  });

  return (
    <List.Item
      icon={extension.icon ? { source: extension.icon } : Icon.Plug}
      title={extension.name}
      subtitle={extension.description}
      keywords={[extension.id, profile.name]}
      accessories={accessories}
      actions={
        <ActionPanel title={extension.name}>
          {extension.enabled && (
            <Action
              title="Open Extension"
              icon={Icon.Plug}
              onAction={() => run(() => openExtension(extension, profile), failureTitle)}
            />
          )}
          {extension.enabled && popupUrl && (
            <Action title="Open Popup in New Tab" icon={Icon.AppWindow} onAction={() => openInTab(popupUrl)} />
          )}
          <Action
            title="Show in Extension Settings"
            icon={Icon.List}
            onAction={() => openInTab(settingsUrl(extension))}
          />
          <Action.CopyToClipboard title="Copy Extension ID" content={extension.id} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { showBuiltInExtensions } = getPreferenceValues<Preferences.SearchExtensions>();
  const {
    data: profiles = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getExtensionProfiles, [], {
    failureToastOptions: { title: "Could not read Dia extensions" },
  });
  const [selected, setSelected] = useCachedState<string>("profile-filter", ALL_PROFILES);
  const retryActions = (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </ActionPanel>
  );
  // Fall back to all profiles when the remembered profile was removed
  const filter = profiles.some((profile) => PROFILE_PREFIX + profile.directory === selected) ? selected : ALL_PROFILES;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search extensions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Profile" value={filter} onChange={setSelected}>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="All Profiles" value={ALL_PROFILES} icon={Icon.PersonCircle} />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {profiles.map((profile) => (
              <List.Dropdown.Item
                key={profile.directory}
                title={profile.isActive ? `${profile.name} (Active)` : profile.name}
                value={PROFILE_PREFIX + profile.directory}
                icon={{ source: Icon.CircleFilled, tintColor: getSpaceTint(profile.color) }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not read Dia extensions"
          description={error.message}
          actions={retryActions}
        />
      ) : (
        <List.EmptyView icon={Icon.Plug} title="No extensions found" />
      )}
      {profiles
        .filter((profile) => filter === ALL_PROFILES || PROFILE_PREFIX + profile.directory === filter)
        .map((profile) => {
          if (profile.error) {
            return (
              <List.Section key={profile.directory} title={profile.name}>
                <List.Item
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                  title={`Could not read ${profile.name}`}
                  subtitle={profile.error}
                  actions={retryActions}
                />
              </List.Section>
            );
          }
          const extensions = profile.extensions.filter((extension) => showBuiltInExtensions || !extension.builtIn);
          // Profiles without extensions get no section; they stay in the dropdown
          if (extensions.length === 0) return null;
          const count = `${extensions.length} ${extensions.length === 1 ? "extension" : "extensions"}`;
          return (
            <List.Section
              key={profile.directory}
              title={profile.name}
              subtitle={profile.isActive ? `Active · ${count}` : count}
            >
              {extensions.map((extension) => (
                <ExtensionItem key={extension.id} extension={extension} profile={profile} />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}
