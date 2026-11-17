import {
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useSectionSettings } from "./hooks/use-section-settings";
import { fetchInbox, InboxError, InboxErrorKind } from "./lib/api";
import {
  authorIcon,
  GRAPHITE_CLI_AUTH_URL,
  GRAPHITE_CLI_INSTALL_URL,
  inboxErrorTitles,
  pluralize,
  pullRequestLinks,
} from "./lib/presentation";

const MAX_TITLE_LENGTH = 60;
// Monochrome Graphite mark, tinted to match the menu bar in light and dark mode.
const GRAPHITE_ICON: Image.ImageLike = { source: "menu-bar-icon.png", tintColor: Color.PrimaryText };

const ERROR_LABELS: Record<InboxErrorKind, string> = {
  NOT_SET_UP: "Set Up CLI",
  SIGNED_OUT: "Signed Out",
  OFFLINE: "Offline",
  UNEXPECTED: "Error",
};

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

async function openInboxInRaycast() {
  try {
    await launchCommand({ name: "inbox", type: LaunchType.UserInitiated });
  } catch {
    await showHUD("Turn on Pull Request Inbox in Raycast Settings → Extensions → Graphite");
  }
}

export default function Command() {
  const { showEmptySections, showCount } = getPreferenceValues<Preferences.MenuBar>();
  const {
    data: inbox,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchInbox, [], {
    keepPreviousData: true,
    // The menu shows its own error state, and toasts from a background refresh would be noise.
    onError: () => undefined,
  });
  const sectionSettings = useSectionSettings();

  const displayedSections = sectionSettings.visible(inbox?.sections ?? []);
  const count = displayedSections.reduce(
    (total, section) => total + (section.includeInTotalCount ? section.totalUnpaginatedPrs : 0),
    0,
  );
  const errorKind: InboxErrorKind | undefined =
    error instanceof InboxError ? error.kind : error ? "UNEXPECTED" : undefined;

  // Without data, show the error state the way the Graphite menu bar app does.
  const title = !inbox && errorKind ? ERROR_LABELS[errorKind] : showCount && count > 0 ? String(count) : undefined;
  const icon = !inbox && errorKind ? { source: Icon.Warning, tintColor: Color.PrimaryText } : GRAPHITE_ICON;
  const tooltip = errorKind
    ? (error?.message ?? "Graphite")
    : `Graphite: ${pluralize(count, "pull request")} ${count === 1 ? "needs" : "need"} your attention`;

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={isLoading}>
      {errorKind ? (
        <MenuBarExtra.Section title={inboxErrorTitles[errorKind]}>
          <MenuBarExtra.Item title={truncate(error?.message ?? "", 80)} icon={Icon.ExclamationMark} />
          {inbox ? <MenuBarExtra.Item title="Showing your last loaded inbox" icon={Icon.Clock} /> : null}
          {errorKind === "NOT_SET_UP" ? (
            <MenuBarExtra.Item
              title="Install the Graphite CLI"
              icon={Icon.Download}
              onAction={() => open(GRAPHITE_CLI_INSTALL_URL)}
            />
          ) : null}
          {errorKind === "NOT_SET_UP" || errorKind === "SIGNED_OUT" ? (
            <MenuBarExtra.Item
              title="Get a CLI Auth Token"
              icon={Icon.Key}
              onAction={() => open(GRAPHITE_CLI_AUTH_URL)}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {inbox
        ? displayedSections
            .filter((section) => showEmptySections || section.totalUnpaginatedPrs > 0)
            .map((section) => (
              <MenuBarExtra.Section
                key={section.sectionId}
                title={`${section.name} (${section.totalUnpaginatedPrs})${section.includeInTotalCount ? " ⚐" : ""}`}
              >
                {[...section.prs]
                  .sort((a, b) => b.number - a.number)
                  .map((pr) => {
                    const links = pullRequestLinks(inbox.appUrl, pr.repo.owner, pr.repo.name, pr.number);
                    const secondaryUrl = links.primary === links.graphite ? links.github : links.graphite;
                    const label = `#${pr.number}: ${truncate(pr.title, MAX_TITLE_LENGTH)}`;
                    return (
                      <MenuBarExtra.Item
                        key={`${section.sectionId}-${pr.repo.owner}/${pr.repo.name}#${pr.number}`}
                        icon={authorIcon(pr)}
                        title={label}
                        subtitle={pr.repo.name}
                        tooltip={`${pr.title}\n${pr.repo.owner}/${pr.repo.name} · ${pr.author?.login ?? "unknown"}`}
                        onAction={() => open(links.primary)}
                        alternate={
                          <MenuBarExtra.Item
                            icon={authorIcon(pr)}
                            title={`${label} (${links.primaryName === "Graphite" ? "GitHub" : "Graphite"})`}
                            onAction={() => open(secondaryUrl)}
                          />
                        }
                      />
                    );
                  })}
                {section.totalUnpaginatedPrs > section.prs.length ? (
                  <MenuBarExtra.Item title="See All" icon={Icon.ArrowNe} onAction={() => open(inbox.appUrl)} />
                ) : null}
              </MenuBarExtra.Section>
            ))
        : null}

      {inbox && displayedSections.length > 0 && displayedSections.every((s) => s.totalUnpaginatedPrs === 0) ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="All caught up" icon={Icon.CheckCircle} />
        </MenuBarExtra.Section>
      ) : null}

      {inbox && inbox.sections.length === 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Your Graphite inbox has no sections"
            icon={Icon.Tray}
            onAction={() => open(inbox.appUrl)}
          />
        </MenuBarExtra.Section>
      ) : null}

      {inbox && inbox.sections.length > 0 && displayedSections.length === 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="All sections are hidden" icon={Icon.EyeDisabled} />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Inbox in Raycast"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={openInboxInRaycast}
        />
        <MenuBarExtra.Item
          title="Open Graphite"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(inbox?.appUrl ?? "https://app.graphite.com")}
        />
        {inbox ? (
          <MenuBarExtra.Submenu title="Sections to Display" icon={Icon.Eye}>
            {sectionSettings.arrange(inbox.sections).map((section) => {
              const displayed = !sectionSettings.isHidden(section.sectionId);
              return (
                <MenuBarExtra.Item
                  key={section.sectionId}
                  icon={displayed ? Icon.CheckCircle : Icon.Circle}
                  title={`${section.name} (${section.totalUnpaginatedPrs})${section.includeInTotalCount ? " ⚐ adds to count" : ""}`}
                  onAction={() => sectionSettings.toggle(section.sectionId)}
                />
              );
            })}
            <MenuBarExtra.Item title="Add Section in Graphite" icon={Icon.Plus} onAction={() => open(inbox.appUrl)} />
          </MenuBarExtra.Submenu>
        ) : null}
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
