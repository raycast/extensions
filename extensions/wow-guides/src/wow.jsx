import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

const wowData = [
  {
    class: "Warrior",
    specs: [
      { name: "Arms", role: "dps" },
      { name: "Fury", role: "dps" },
      { name: "Protection", role: "tank" },
    ],
  },
  {
    class: "Paladin",
    specs: [
      { name: "Holy", role: "healer" },
      { name: "Protection", role: "tank" },
      { name: "Retribution", role: "dps" },
    ],
  },
  {
    class: "Hunter",
    specs: [
      { name: "Beast Mastery", role: "dps" },
      { name: "Marksmanship", role: "dps" },
      { name: "Survival", role: "dps" },
    ],
  },
  {
    class: "Rogue",
    specs: [
      { name: "Assassination", role: "dps" },
      { name: "Outlaw", role: "dps" },
      { name: "Subtlety", role: "dps" },
    ],
  },
  {
    class: "Priest",
    specs: [
      { name: "Discipline", role: "healer" },
      { name: "Holy", role: "healer" },
      { name: "Shadow", role: "dps" },
    ],
  },
  {
    class: "Shaman",
    specs: [
      { name: "Elemental", role: "dps" },
      { name: "Enhancement", role: "dps" },
      { name: "Restoration", role: "healer" },
    ],
  },
  {
    class: "Mage",
    specs: [
      { name: "Arcane", role: "dps" },
      { name: "Fire", role: "dps" },
      { name: "Frost", role: "dps" },
    ],
  },
  {
    class: "Warlock",
    specs: [
      { name: "Affliction", role: "dps" },
      { name: "Demonology", role: "dps" },
      { name: "Destruction", role: "dps" },
    ],
  },
  {
    class: "Monk",
    specs: [
      { name: "Brewmaster", role: "tank" },
      { name: "Mistweaver", role: "healer" },
      { name: "Windwalker", role: "dps" },
    ],
  },
  {
    class: "Druid",
    specs: [
      { name: "Balance", role: "dps" },
      { name: "Feral", role: "dps" },
      { name: "Guardian", role: "tank" },
      { name: "Restoration", role: "healer" },
    ],
  },
  {
    class: "Demon Hunter",
    specs: [
      { name: "Havoc", role: "dps" },
      { name: "Vengeance", role: "tank" },
    ],
  },
  {
    class: "Death Knight",
    specs: [
      { name: "Blood", role: "tank" },
      { name: "Frost", role: "dps" },
      { name: "Unholy", role: "dps" },
    ],
  },
  {
    class: "Evoker",
    specs: [
      { name: "Devastation", role: "dps" },
      { name: "Preservation", role: "healer" },
      { name: "Augmentation", role: "dps" },
    ],
  },
];

const guideSections = {
  "bis-gear": { title: "BiS Gear", urlPart: "bis-gear" },
  rotation: { title: "Rotation", urlPart: "rotation-cooldowns-pve" },
  "talent-builds": { title: "Talent Builds", urlPart: "talent-builds-pve" },
  stats: { title: "Stats", urlPart: "stat-priority-pve" },
  consumables: { title: "Consumables", urlPart: "enchants-gems-pve" },
};

/**
 * A component to display the list of guides for a selected class and spec.
 */
function SpecGuides({ wowClass, spec }) {
  const classUrl = wowClass.class.toLowerCase().replace(/\s/g, "-");
  const specUrl = spec.name.toLowerCase().replace(/\s/g, "-");
  const specRole = spec.role;

  const generateUrl = (sectionUrl, role) => {
    let finalSectionUrl = sectionUrl;
    // Append role to URL for role-specific guides (healer, tank, dps)
    if (role && sectionUrl.includes("pve")) {
      finalSectionUrl = `${sectionUrl}-${role}`;
    }
    return `https://www.wowhead.com/guide/classes/${classUrl}/${specUrl}/${finalSectionUrl}`;
  };

  return (
    <List navigationTitle={`${wowClass.class} - ${spec.name} Guides`}>
      {Object.entries(guideSections).map(([key, section]) => {
        const url = generateUrl(section.urlPart, specRole);
        return (
          <List.Item
            key={key}
            title={section.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/**
 * Main command component, refactored for better navigation.
 * It first shows a list of specializations for the selected class.
 * Selecting a spec will navigate to a new view with the guides.
 */
export default function Command() {
  const [selectedClass, setSelectedClass] = useState(wowData[0].class);

  const handleClassChange = (newClass) => {
    setSelectedClass(newClass);
  };

  const selectedClassData = wowData.find((c) => c.class === selectedClass);

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Class"
          onChange={handleClassChange}
          storeValue
        >
          <List.Dropdown.Section title="Classes">
            {wowData.map((c) => (
              <List.Dropdown.Item
                key={c.class}
                title={c.class}
                value={c.class}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      navigationTitle="Search WoW Guides"
    >
      <List.Section title={`${selectedClass} Specializations`}>
        {selectedClassData?.specs.map((spec) => (
          <List.Item
            key={spec.name}
            title={spec.name}
            subtitle={spec.role.charAt(0).toUpperCase() + spec.role.slice(1)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Guides"
                  target={
                    <SpecGuides wowClass={selectedClassData} spec={spec} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
