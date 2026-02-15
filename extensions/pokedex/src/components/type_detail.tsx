import { Icon, List } from "@raycast/api";
import { TypeChartType } from "../types";

export function TypeDetail({
  type,
  allTypes,
}: {
  type: TypeChartType;
  allTypes: TypeChartType[];
}) {
  // Use the localized name if available
  const typeName = type.typenames[0]?.name || type.name;

  // OFFENSE: When this type attacks others
  const attacking = {
    superEffective: [] as List.Item.Accessory[],
    neutral: [] as List.Item.Accessory[],
    notVeryEffective: [] as List.Item.Accessory[],
    noEffect: [] as List.Item.Accessory[],
  };

  const efficacyMap = new Map();
  type.typeefficacies.forEach((eff) => {
    efficacyMap.set(eff.target_type_id, eff.damage_factor);
  });

  allTypes.forEach((target) => {
    if (target.id >= 10000) return;
    const factor = efficacyMap.has(target.id)
      ? efficacyMap.get(target.id)
      : 100;
    const targetName = target.typenames[0]?.name || target.name;

    if (factor === 200)
      attacking.superEffective.push({
        tooltip: targetName,
        icon: `types/${target.name}.svg`,
      });
    else if (factor === 100)
      attacking.neutral.push({
        tooltip: targetName,
        icon: `types/${target.name}.svg`,
      });
    else if (factor === 50)
      attacking.notVeryEffective.push({
        tooltip: targetName,
        icon: `types/${target.name}.svg`,
      });
    else if (factor === 0)
      attacking.noEffect.push({
        tooltip: targetName,
        icon: `types/${target.name}.svg`,
      });
  });

  // DEFENSE: When this type is hit by others
  const defending = {
    weakTo: [] as List.Item.Accessory[],
    neutral: [] as List.Item.Accessory[],
    resistantTo: [] as List.Item.Accessory[],
    immuneTo: [] as List.Item.Accessory[],
  };

  allTypes.forEach((attacker) => {
    if (attacker.id >= 10000) return;
    const attackerName = attacker.typenames[0]?.name || attacker.name;

    const eff = attacker.typeefficacies.find(
      (e) => e.target_type_id === type.id,
    );
    const factor = eff ? eff.damage_factor : 100;

    if (factor === 200)
      defending.weakTo.push({
        tooltip: attackerName,
        icon: `types/${attacker.name}.svg`,
      });
    else if (factor === 100)
      defending.neutral.push({
        tooltip: attackerName,
        icon: `types/${attacker.name}.svg`,
      });
    else if (factor === 50)
      defending.resistantTo.push({
        tooltip: attackerName,
        icon: `types/${attacker.name}.svg`,
      });
    else if (factor === 0)
      defending.immuneTo.push({
        tooltip: attackerName,
        icon: `types/${attacker.name}.svg`,
      });
  });

  return (
    <List navigationTitle={`${typeName} | Type Chart`}>
      <List.Section
        title="Attacking"
        subtitle="Effectiveness when this type attacks others"
      >
        <List.Item
          title="Super Effective"
          icon={Icon.ChevronUp}
          subtitle="2x"
          accessories={attacking.superEffective}
        />
        <List.Item
          title="Neutral"
          icon={Icon.CircleFilled}
          subtitle="1x"
          accessories={attacking.neutral}
        />
        <List.Item
          title="Not Very Effective"
          icon={Icon.CircleProgress50}
          subtitle="0.5x"
          accessories={attacking.notVeryEffective}
        />
        <List.Item
          title="No Effect"
          icon={Icon.XMarkCircle}
          subtitle="0x"
          accessories={attacking.noEffect}
        />
      </List.Section>
      <List.Section
        title="Defending"
        subtitle="Effectiveness when this type is hit by others"
      >
        <List.Item
          title="Weak To"
          icon={Icon.ChevronUp}
          subtitle="2x"
          accessories={defending.weakTo}
        />
        <List.Item
          title="Neutral"
          icon={Icon.CircleFilled}
          subtitle="1x"
          accessories={defending.neutral}
        />
        <List.Item
          title="Resistant To"
          icon={Icon.CircleProgress50}
          subtitle="0.5x"
          accessories={defending.resistantTo}
        />
        <List.Item
          title="Immune To"
          icon={Icon.XMarkCircle}
          subtitle="0x"
          accessories={defending.immuneTo}
        />
      </List.Section>
    </List>
  );
}
