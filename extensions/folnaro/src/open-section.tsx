import { Action, ActionPanel, Icon, List, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { BRAND_ACCENT } from "./lib/brand";
import { t, type StringKey } from "./lib/text";
import { openFolnaro, showError } from "./lib/raycast";
import { SECTION_GROUPS, sectionScript, type Section } from "./lib/sections";

async function openSection(section: Section) {
  const name = t(`section.${section.id}` as StringKey);
  try {
    await openFolnaro();
  } catch (error) {
    await showError(error);
    return;
  }
  try {
    await runAppleScript(sectionScript(section), { timeout: 5000 });
    await showHUD(t("section.opened", { section: name }), { popToRootType: PopToRootType.Immediate });
  } catch {
    // System Events needs Accessibility access for Raycast. Folnaro is open either way.
    await showToast({ style: Toast.Style.Failure, title: t("section.needsAccessibility") });
  }
}

export default function OpenSection() {
  return (
    <List searchBarPlaceholder={t("section.placeholder")}>
      {SECTION_GROUPS.map((group, index) => (
        <List.Section key={group.title ?? `group-${index}`} title={group.title ? t(group.title) : undefined}>
          {group.sections.map((section) => {
            const title = t(`section.${section.id}` as StringKey);
            const shortcut = `${section.option ? "⌥" : ""}⌘${section.key}`;
            return (
              <List.Item
                key={section.id}
                icon={{ source: Icon[section.icon as keyof typeof Icon], tintColor: BRAND_ACCENT }}
                title={title}
                keywords={[section.id]}
                accessories={[{ text: shortcut, tooltip: shortcut }]}
                actions={
                  <ActionPanel>
                    <Action title={t("section.open")} icon={Icon.AppWindow} onAction={() => openSection(section)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
