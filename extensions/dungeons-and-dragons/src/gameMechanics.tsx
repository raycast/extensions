import { List, ActionPanel, Action } from "@raycast/api";
import { getDnd } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
interface monstersType {
  isLoading: boolean;
  data: indexCollection;
}

export default function Command() {
  const rules = getDnd("/api/rule-sections") as monstersType;

  return (
    <List
      searchBarPlaceholder={`Searching ${rules.data.results.length} rules...`}
      throttle={true}
      filtering={true}
      isLoading={rules.isLoading}
    >
      <List.Item
        key={"conditions"}
        title={"Conditions"}
        subtitle={`A condition alters a creature's capabilities in a variety of ways and can arise as a result of a spell, a class feature, a monster's attack, or other effect. Most conditions, such as blinded, are impairments, but a few, such as invisible, can be advantageous.`}
        actions={
          <ActionPanel>
            <Action.Push
              title={`Show Condition Details`}
              target={
                <List
                  searchBarPlaceholder={`Searching ${rules.data.results.length} rules...`}
                  throttle={true}
                  filtering={true}
                  isLoading={rules.isLoading}
                >
                  {rules.data.results.map((rule: index) => (
                    <List.Item
                      key={rule.index}
                      title={rule.name}
                      actions={
                        <ActionPanel>
                          <Action.Push title={`Show ${rule.name} Details`} target={"qow"} />
                        </ActionPanel>
                      }
                    />
                  ))}
                </List>
              }
            />
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
            <Action.Push title={`Show Damage Types Details`} target={`wow`} />
          </ActionPanel>
        }
      />
      <List.Item
        key={"magicTypes"}
        title={"Magic Types"}
        subtitle={
          "Academies of magic group spells into eight categories called schools of magic. Scholars, particularly wizards, apply these categories to all spells, believing that all magic functions in essentially the same way, whether it derives from rigorous study or is bestowed by a deity.        "
        }
        actions={
          <ActionPanel>
            <Action.Push title={`Show Damage Types Details`} target={`wow`} />
          </ActionPanel>
        }
      />
    </List>
  );
}
