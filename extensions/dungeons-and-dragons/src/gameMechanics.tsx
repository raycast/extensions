import { List, ActionPanel, Action, Detail } from "@raycast/api";
import { getDnd } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
import MechanicDetail from "./templates/mechanicDetail";
interface mechanicsType {
  isLoading: boolean;
  data: indexCollection;
}

const mechanicList = function (mechanics: mechanicsType, title?: string) {
  return (
    <List
      searchBarPlaceholder={`Searching ${mechanics.data.results.length} ${title ?? "items"}...`}
      throttle={true}
      filtering={true}
      isLoading={mechanics.isLoading}
      isShowingDetail={true}
    >
      {mechanics?.data.results?.map((mechanic: index) => (
        <List.Item
          key={mechanic.index}
          title={mechanic.name}
          detail={<MechanicDetail index={mechanic.index} url={mechanic.url} />}
        />
      ))}
    </List>
  );
};

export default function Command() {
  const conditions = getDnd("/api/conditions") as mechanicsType;
  const damageTypes = getDnd("/api/damage-types") as mechanicsType;
  const magicSchools = getDnd("/api/magic-schools") as mechanicsType;

  if (
    (!conditions?.data && conditions.isLoading) ||
    (!damageTypes?.data && damageTypes.isLoading) ||
    (!magicSchools?.data && magicSchools.isLoading)
  ) {
    return <Detail isLoading={true} markdown={`# Loading game mechanics...`} />;
  }

  return (
    <List
      searchBarPlaceholder={`Look up conditions, damage types, and magic schools`}
      throttle={true}
      filtering={true}
      isLoading={conditions.isLoading}
    >
      <List.Item
        key={"conditions"}
        title={"Conditions"}
        subtitle={`A condition alters a creature's capabilities in a variety of ways and can arise as a result of a spell, a class feature, a monster's attack, or other effect. Most conditions, such as blinded, are impairments, but a few, such as invisible, can be advantageous.`}
        actions={
          <ActionPanel>
            <Action.Push title={`Show Condition Details`} target={mechanicList(conditions, "Conditions")} />
          </ActionPanel>
        }
      />
      <List.Item
        key={"damageTypes"}
        title={"Damage Types"}
        subtitle={
          "Different attacks, damaging spells, and other harmful effects deal different types of damage. Damage types have no rules of their own, but other rules, such as damage resistance, rely on the types."
        }
        actions={
          <ActionPanel>
            <Action.Push title={`Show Damage Types Details`} target={mechanicList(damageTypes, "Damage Types")} />
          </ActionPanel>
        }
      />
      <List.Item
        key={"magicSchools"}
        title={"Magic Schools"}
        subtitle={
          "Academies of magic group spells into eight categories called schools of magic. Scholars, particularly wizards, apply these categories to all spells, believing that all magic functions in essentially the same way, whether it derives from rigorous study or is bestowed by a deity."
        }
        actions={
          <ActionPanel>
            <Action.Push title={`Show Magic Types Details`} target={mechanicList(magicSchools, "Magic Schools")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
