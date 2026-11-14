import { Action, ActionPanel, closeMainWindow, Color, getPreferenceValues, Icon, List, open } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import {
  extensionSettingsUrl,
  getExtensionProfiles,
  needsAccessibility as isAccessibilityError,
  openExtension,
  openURLInSpace,
  spaceLabel,
  type BrowserExtension,
  type ExtensionProfile,
} from "./extensions";
import { getSpaceTint, truncateSpaceName } from "./utils";

const ALL_SPACES = "all";
/** Prefix for a space's dropdown value, so a space named "all" can't collide with All Spaces. */
const SPACE_PREFIX = "space:";
const ACCESSIBILITY_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

async function run(action: () => Promise<unknown>, failureTitle: string) {
  try {
    await closeMainWindow();
    await action();
  } catch (error) {
    const needsAccessibility = isAccessibilityError(error);
    await showFailureToast(error, {
      title: needsAccessibility ? "Raycast needs Accessibility access" : failureTitle,
      primaryAction: needsAccessibility
        ? { title: "Open Accessibility Settings", onAction: () => open(ACCESSIBILITY_SETTINGS_URL) }
        : undefined,
    });
  }
}

function ExtensionItem({ extension, profile }: { extension: BrowserExtension; profile: ExtensionProfile }) {
  const { popupUrl } = extension;
  const failureTitle = `Could not open ${extension.name}`;
  const openInTab = (url: string) => run(() => openURLInSpace(url, profile.space), failureTitle);
  const accessories: List.Item.Accessory[] = [];
  if (!extension.enabled) accessories.push({ tag: { value: "Disabled", color: Color.SecondaryText } });
  if (extension.pinned) accessories.push({ icon: Icon.Tack, tooltip: "Pinned to toolbar" });
  // Extensions shared by all spaces get no space tag; their section says so
  if (profile.space) {
    accessories.push({
      tag: { value: truncateSpaceName(profile.space), color: getSpaceTint(profile.color) },
      tooltip: profile.space,
    });
  }

  return (
    <List.Item
      icon={extension.icon ? { source: extension.icon } : Icon.Plug}
      title={extension.name}
      subtitle={extension.description}
      keywords={[extension.id, ...(profile.space ? [profile.space] : [])]}
      accessories={accessories}
      actions={
        <ActionPanel title={extension.name}>
          {extension.enabled && (
            <Action
              title="Open Extension"
              icon={Icon.Plug}
              onAction={() => run(() => openExtension(extension, profile.space), failureTitle)}
            />
          )}
          {extension.enabled && popupUrl && (
            <Action title="Open Popup in New Tab" icon={Icon.AppWindow} onAction={() => openInTab(popupUrl)} />
          )}
          <Action
            title="Show in Extension Settings"
            icon={Icon.List}
            onAction={() => openInTab(extensionSettingsUrl(extension))}
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
  const [selected, setSelected] = useCachedState<string>("space-filter", ALL_SPACES);
  const retryActions = (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </ActionPanel>
  );
  // Only spaces with their own Chromium profile can be filtered; shared extensions show under every space
  const spaceProfiles = profiles.filter((profile) => profile.space);
  // Fall back to all spaces when the remembered space was removed
  const filter = spaceProfiles.some((profile) => SPACE_PREFIX + profile.space === selected) ? selected : ALL_SPACES;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search extensions..."
      searchBarAccessory={
        spaceProfiles.length > 0 ? (
          <List.Dropdown tooltip="Filter by Space" value={filter} onChange={setSelected}>
            <List.Dropdown.Section>
              <List.Dropdown.Item title="All Spaces" value={ALL_SPACES} icon={Icon.PersonCircle} />
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              {spaceProfiles.map((profile) => (
                <List.Dropdown.Item
                  key={profile.directory}
                  title={profile.isActive ? `${profile.space} (Active)` : profile.space!}
                  value={SPACE_PREFIX + profile.space}
                  icon={{ source: Icon.CircleFilled, tintColor: getSpaceTint(profile.color) }}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
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
        .filter((profile) => filter === ALL_SPACES || !profile.space || SPACE_PREFIX + profile.space === filter)
        .map((profile) => {
          const title = profile.space ?? "Available in All Spaces";
          if (profile.error) {
            return (
              <List.Section key={profile.directory} title={title}>
                <List.Item
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                  title={`Could not read the extensions of ${spaceLabel(profile)}`}
                  subtitle={profile.error}
                  actions={retryActions}
                />
              </List.Section>
            );
          }
          const extensions = profile.extensions.filter((extension) => showBuiltInExtensions || !extension.builtIn);
          // Spaces without extensions get no section; they stay in the dropdown
          if (extensions.length === 0) return null;
          const count = `${extensions.length} ${extensions.length === 1 ? "extension" : "extensions"}`;
          return (
            <List.Section
              key={profile.directory}
              title={title}
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
