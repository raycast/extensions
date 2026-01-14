import { Color, Detail } from "@raycast/api";
import { typeColor } from "../utils";
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
    superEffective: [] as string[],
    neutral: [] as string[],
    notVeryEffective: [] as string[],
    noEffect: [] as string[],
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

    if (factor === 200) attacking.superEffective.push(targetName);
    else if (factor === 100) attacking.neutral.push(targetName);
    else if (factor === 50) attacking.notVeryEffective.push(targetName);
    else if (factor === 0) attacking.noEffect.push(targetName);
  });

  // DEFENSE: When this type is hit by others
  const defending = {
    weakTo: [] as string[],
    neutral: [] as string[],
    resistantTo: [] as string[],
    immuneTo: [] as string[],
  };

  allTypes.forEach((attacker) => {
    if (attacker.id >= 10000) return;
    const attackerName = attacker.typenames[0]?.name || attacker.name;

    const eff = attacker.typeefficacies.find(
      (e) => e.target_type_id === type.id,
    );
    const factor = eff ? eff.damage_factor : 100;

    if (factor === 200) defending.weakTo.push(attackerName);
    else if (factor === 100) defending.neutral.push(attackerName);
    else if (factor === 50) defending.resistantTo.push(attackerName);
    else if (factor === 0) defending.immuneTo.push(attackerName);
  });

  const markdown = `
# ${typeName}

## Attacking
_Effectiveness when ${typeName} attacks other types_

**Super Effective (2x)**
${attacking.superEffective.join(", ") || "_None_"}

**Neutral (1x)**
${attacking.neutral.join(", ") || "_None_"}

**Not Very Effective (0.5x)**
${attacking.notVeryEffective.join(", ") || "_None_"}

**No Effect (0x)**
${attacking.noEffect.join(", ") || "_None_"}

---

## Defending
_Effectiveness when ${typeName} is hit by other types_

**Weak To (2x)**
${defending.weakTo.join(", ") || "_None_"}

**Neutral (1x)**
${defending.neutral.join(", ") || "_None_"}

**Resistant To (0.5x)**
${defending.resistantTo.join(", ") || "_None_"}

**Immune To (0x)**
${defending.immuneTo.join(", ") || "_None_"}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${typeName} | Type Chart`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Type"
            text={typeName}
            icon={{
              source: `types/${type.name}.svg`,
              tintColor: typeColor[type.name] || Color.PrimaryText,
            }}
          />
        </Detail.Metadata>
      }
    />
  );
}
