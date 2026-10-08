import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { IMBUEMENTS, Imbuement, ImbuementTier } from "./imbuements-data";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const filteredImbuements = IMBUEMENTS.filter(
    (imbuement) =>
      imbuement.name.toLowerCase().includes(searchText.toLowerCase()) ||
      imbuement.real_name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      searchBarPlaceholder="Search imbuements..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredImbuements.map((imbuement) => (
        <ImbuementListItem key={imbuement.name} imbuement={imbuement} />
      ))}
    </List>
  );
}

function ImbuementListItem({ imbuement }: { imbuement: Imbuement }) {
  const powerfulTier = imbuement.tiers.find((t) => t.tier === "Powerful");

  return (
    <List.Item
      title={imbuement.name}
      subtitle={imbuement.real_name}
      accessories={[
        {
          text: powerfulTier?.effect || "",
          icon: Icon.Wand,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Tiers & Materials"
            icon={Icon.List}
            target={<ImbuementDetail imbuement={imbuement} />}
          />
        </ActionPanel>
      }
    />
  );
}

function ImbuementDetail({ imbuement }: { imbuement: Imbuement }) {
  return (
    <List
      navigationTitle={imbuement.name}
      searchBarPlaceholder="Search tiers..."
    >
      <List.Section title="Description">
        <List.Item
          title={imbuement.description}
          icon={{ source: Icon.Info, tintColor: Color.Blue }}
        />
      </List.Section>

      <List.Section title="Equipment Types">
        {imbuement.equipmentTypes.map((equipType, idx) => (
          <List.Item
            key={idx}
            title={equipType}
            icon={{ source: Icon.Shield, tintColor: Color.Purple }}
          />
        ))}
      </List.Section>

      {imbuement.tiers
        .slice()
        .reverse()
        .map((tier, index) => (
          <TierSection key={index} imbuement={imbuement} tier={tier} />
        ))}
    </List>
  );
}

function TierSection({
  imbuement,
  tier,
}: {
  imbuement: Imbuement;
  tier: ImbuementTier;
}) {
  const getTierColor = (tierName: string): Color => {
    switch (tierName) {
      case "Basic":
        return Color.Green;
      case "Intricate":
        return Color.Orange;
      case "Powerful":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  const tierColor = getTierColor(tier.tier);

  return (
    <List.Section title={`${tier.tier} - ${tier.effect}`}>
      {tier.materials.map((material, idx) => (
        <List.Item
          key={idx}
          title={material.item}
          accessories={[
            {
              text: `×${material.amount}`,
              icon: { source: Icon.Box, tintColor: tierColor },
            },
          ]}
          icon={{ source: Icon.Dot, tintColor: tierColor }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Material Info"
                content={`${imbuement.name} (${tier.tier}): ${material.amount}× ${material.item}`}
              />
              <Action.CopyToClipboard
                title="Copy All Materials"
                content={`${imbuement.name} (${tier.tier}):\n${tier.materials.map((m) => `${m.amount}× ${m.item}`).join("\n")}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
