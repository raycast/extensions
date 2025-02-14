import { ActionPanel, Grid, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { Components, daisyUIComponent } from "./utils/components";
import ComponentDetail from "./detail-component";

function SectionDropdown(props: { sections: string[]; onSectionChange: (section: string) => void }) {
  const { sections, onSectionChange } = props;
  return (
    <Grid.Dropdown tooltip="Filter by Section" storeValue={true} onChange={(newValue) => onSectionChange(newValue)}>
      <Grid.Dropdown.Item key="all" title="All Sections" value="all" />
      <Grid.Dropdown.Section title="Component Categories">
        {sections.map((section) => (
          <Grid.Dropdown.Item key={section} title={section} value={section} />
        ))}
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );
}

export default function Command() {
  const [selectedSection, setSelectedSection] = useState<string>("all");

  // Group Components by section with proper typing
  const { groupedComponents, sections } = Components.reduce(
    (acc, component) => {
      const section = component.section || "Other";
      if (!acc.groupedComponents[section]) {
        acc.groupedComponents[section] = [];
        acc.sections.add(section);
      }
      acc.groupedComponents[section].push(component);
      return acc;
    },
    {
      groupedComponents: {} as Record<string, daisyUIComponent[]>,
      sections: new Set<string>(),
    },
  );

  return (
    <Grid
      aspectRatio="16/9"
      columns={4}
      fit={Grid.Fit.Fill}
      searchBarAccessory={<SectionDropdown sections={Array.from(sections)} onSectionChange={setSelectedSection} />}
    >
      {Object.entries(groupedComponents).map(([sectionName, components]) => {
        if (selectedSection !== "all" && sectionName !== selectedSection) return null;

        return (
          <Grid.Section key={sectionName} title={sectionName}>
            {components.map((component) => (
              <Grid.Item
                key={component.name}
                title={component.name}
                subtitle={component.description}
                content={component.imageUrl}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Sidebar}
                      target={<ComponentDetail component={component} />}
                    />
                    <Action.OpenInBrowser
                      url={component.componentUrl}
                      title="Open Documentation"
                      icon={Icon.Book}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.CopyToClipboard
                      content={component.name}
                      title="Copy Component Name"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}
