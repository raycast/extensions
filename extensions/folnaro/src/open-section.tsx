import { Action, ActionPanel, Icon, List, PopToRootType, showHUD } from "@raycast/api";
import { BRAND_ACCENT } from "./lib/brand";
import { t, type StringKey } from "./lib/text";
import { openFolnaro, showError } from "./lib/raycast";
import { SECTION_GROUPS, sectionUrl, type Section } from "./lib/sections";

async function openSection(section: Section) {
  const name = t(`section.${section.id}` as StringKey);
  try {
    await openFolnaro(sectionUrl(section));
  } catch (error) {
    await showError(error);
    return;
  }
  await showHUD(t("section.opened", { section: name }), { popToRootType: PopToRootType.Immediate });
}

export default function OpenSection() {
  return (
    <List searchBarPlaceholder={t("section.placeholder")}>
      {SECTION_GROUPS.map((group) => (
        <List.Section key={group.title} title={t(group.title)}>
          {group.sections.map((section) => (
            <List.Item
              key={section.id}
              icon={{ source: Icon[section.icon as keyof typeof Icon], tintColor: BRAND_ACCENT }}
              title={t(`section.${section.id}` as StringKey)}
              keywords={[section.id]}
              actions={
                <ActionPanel>
                  <Action title={t("section.open")} icon={Icon.AppWindow} onAction={() => openSection(section)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
