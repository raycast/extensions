import { List, ActionPanel, Action, Icon, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { Colors } from "./utils/colors";

function SectionDropdown(props: { sections: string[]; onSectionChange: (section: string) => void }) {
  const { sections, onSectionChange } = props;
  return (
    <List.Dropdown tooltip="Filter by Section" storeValue={true} onChange={(newValue) => onSectionChange(newValue)}>
      <List.Dropdown.Item key="all" title="All Sections" value="all" />
      <List.Dropdown.Section title="Color Categories">
        {sections.map((section) => (
          <List.Dropdown.Item key={section} title={section} value={section} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function RaycastTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => environment.appearance === "dark");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  useEffect(() => {
    setIsDarkMode(environment.appearance === "dark");
  }, [environment.appearance]);

  // Group colors by section and get unique sections
  const { groupedColors, sections } = Colors.reduce(
    (acc, color) => {
      const section = color.section || "Other";
      if (!acc.groupedColors[section]) {
        acc.groupedColors[section] = [];
        acc.sections.add(section);
      }
      acc.groupedColors[section].push(color);
      return acc;
    },
    {
      groupedColors: {} as Record<string, typeof Colors>,
      sections: new Set<string>(),
    },
  );

  return (
    <List
      isShowingDetail
      searchBarAccessory={<SectionDropdown sections={Array.from(sections)} onSectionChange={setSelectedSection} />}
    >
      {Object.entries(groupedColors).map(([sectionName, colors]) => {
        if (selectedSection !== "all" && sectionName !== selectedSection) return null;

        return (
          <List.Section key={sectionName} title={sectionName}>
            {colors.map((color) => {
              const currentHex = isDarkMode ? color.darkHex : color.lightHex;
              const currentBgHex = isDarkMode ? color.darkBgHex : color.lightBgHex;
              const currentOklch = isDarkMode ? color.darkOklch : color.lightOklch;

              const imagePreview = `![${color.name} Preview](${environment.assetsPath}/images/${color.name}-${
                isDarkMode ? "dark" : "light"
              }.jpg)`;

              const detailMarkdown = `
# ${color.name}
${color.description}

${imagePreview}
`;

              return (
                <List.Item
                  key={color.name}
                  quickLook={{ path: imagePreview }}
                  title={color.name}
                  icon={{
                    source: Icon.CircleFilled,
                    tintColor: currentHex,
                  }}
                  detail={
                    <List.Item.Detail
                      markdown={detailMarkdown}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="CSS Variable" text={color.cssVariable} />

                          <List.Item.Detail.Metadata.Separator />

                          <List.Item.Detail.Metadata.TagList title="Current Theme">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={currentHex}
                              icon={{ source: Icon.Hashtag, tintColor: currentHex }}
                              color={currentHex}
                            />
                            <List.Item.Detail.Metadata.TagList.Item
                              text={currentOklch}
                              icon={{ source: Icon.Code, tintColor: currentHex }}
                              color={currentHex}
                            />
                          </List.Item.Detail.Metadata.TagList>

                          <List.Item.Detail.Metadata.Separator />

                          <List.Item.Detail.Metadata.TagList title="Light Theme">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={color.lightHex}
                              icon={{ source: Icon.Sun, tintColor: color.lightHex }}
                              color={color.lightBgHex}
                            />
                          </List.Item.Detail.Metadata.TagList>

                          <List.Item.Detail.Metadata.TagList title="Dark Theme">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={currentHex}
                              icon={{ source: isDarkMode ? Icon.Moon : Icon.Sun, tintColor: currentHex }}
                              color={currentBgHex}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Color Name"
                        content={color.name}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Current Hex"
                        content={currentHex}
                        shortcut={{ modifiers: ["cmd"], key: "h" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Current Oklch"
                        content={currentOklch}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.CopyToClipboard
                        // eslint-disable-next-line @raycast/prefer-title-case
                        title="Copy CSS Variable"
                        content={color.cssVariable}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
