import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useSectionSettings } from "../hooks/use-section-settings";
import { InboxSection } from "../lib/api";
import { pluralize } from "../lib/presentation";

/**
 * Pick which of your Graphite inbox sections Raycast shows, and in what order.
 * Sections themselves are created and edited in Graphite.
 */
export function ConfigureSections(props: { sections: InboxSection[]; appUrl: string }) {
  const { sections, appUrl } = props;
  const settings = useSectionSettings();
  const arranged = settings.arrange(sections);

  return (
    <List navigationTitle="Configure Sections" searchBarPlaceholder="Filter sections">
      <List.Section title="Your Graphite Sections" subtitle="↵ shows or hides a section">
        {arranged.map((section, index) => {
          const hidden = settings.isHidden(section.sectionId);
          return (
            <List.Item
              key={section.sectionId}
              icon={
                hidden
                  ? { source: Icon.EyeDisabled, tintColor: Color.SecondaryText }
                  : { source: Icon.Eye, tintColor: Color.Green }
              }
              title={section.name}
              subtitle={hidden ? "Hidden" : undefined}
              accessories={[{ text: pluralize(section.totalUnpaginatedPrs, "PR") }]}
              actions={
                <ActionPanel>
                  <Action
                    title={hidden ? "Show Section" : "Hide Section"}
                    icon={hidden ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() => settings.toggle(section.sectionId)}
                  />
                  {index > 0 ? (
                    <Action
                      title="Move Higher"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={() => settings.move(sections, section.sectionId, -1)}
                    />
                  ) : null}
                  {index < arranged.length - 1 ? (
                    <Action
                      title="Move Lower"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={() => settings.move(sections, section.sectionId, 1)}
                    />
                  ) : null}
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Create or Edit Sections in Graphite" url={appUrl} />
                    {settings.hasCustomizations ? (
                      <Action
                        title="Reset to Graphite's Defaults"
                        icon={Icon.RotateAntiClockwise}
                        onAction={settings.reset}
                      />
                    ) : null}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
