import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ListFiltered } from "../list-filtered";
import { CodeSmells } from "../data/code-smells";
import { Obstruction, Ocurrence, SmellHierarchies } from "../data/types";

type ListSectionProps = {
  sectionTitle: string;
  items: Obstruction[] | Ocurrence[] | SmellHierarchies[];
  icon: Icon;
  categoryFilterName: "Obstruction" | "Ocurrence" | "SmellHierarchies";
};

export const ListSectionCategory = ({ sectionTitle, items, icon, categoryFilterName }: ListSectionProps) => {
  function getSmellsBy(item: string) {
    return CodeSmells.filter((smell) => smell.categories[categoryFilterName].some((category) => category === item));
  }

  return (
    <List.Section title={sectionTitle} subtitle={"Category"}>
      {items.map((item) => (
        <List.Item
          key={item}
          title={item}
          icon={icon}
          actions={
            <ActionPanel>
              <Action.Push title={item} target={<ListFiltered categoryName={item} smells={getSmellsBy(item)} />} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};
