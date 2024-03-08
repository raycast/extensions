import { List, Icon, Color, ActionPanel, Action, useNavigation } from "@raycast/api";
import { FC, useState } from "react";
import { PaperRawData } from "../types";
import { useGetConfig } from "../hooks/useGetConfig";
import { useGetCategories } from "../hooks/useGetCategories";
import { Actions } from "../components/Actions";
import { CreatePaper } from "./CreatePaper";

type Categories = Array<string>;

type PaperSearchBarDropdownProps = {
  onChange: (value: string) => void;
  isLoading: boolean;
  categories: Categories;
};

type ListWrapperItemProps = {
  category: string;
  paperDataRaw: PaperRawData | null;
};

type ListWrapperProps = {
  categories: Categories;
  categoryActive: string;
  papersData: PaperRawData | null;
};

const PaperSearchBarDropdown: FC<PaperSearchBarDropdownProps> = ({ onChange, isLoading, categories }) => {
  return (
    <List.Dropdown
      tooltip="Select a category"
      storeValue={true}
      defaultValue="all"
      onChange={onChange}
      isLoading={isLoading}
      throttle={true}
    >
      <List.Dropdown.Item title="All" value="all" />
      {categories.map((item, index) => (
        <List.Dropdown.Item title={item} value={item.toLowerCase()} key={index} />
      ))}
    </List.Dropdown>
  );
};

const ListWrapperItem: FC<ListWrapperItemProps> = ({ category, paperDataRaw }) => {
  if (paperDataRaw === null) return;

  return (
    <List.Section title={category} subtitle={paperDataRaw[category].papers.length.toString()}>
      {paperDataRaw[category].papers.map((paper, i) => (
        <List.Item
          key={i}
          title={paper.name}
          accessories={[
            // @ts-expect-error Raycast Type
            { text: { value: paper.description || "", color: Color[paperDataRaw[category].color] } },
            { date: new Date(paper.createdAt), icon: Icon.Calendar },
          ]}
          // @ts-expect-error Raycast Type
          icon={{ source: Icon.Circle, tintColor: Color[paperDataRaw[category].color] }}
          actions={<Actions mode="list" paper={paper} category={category} index={i} />}
        />
      ))}
    </List.Section>
  );
};

const ListWrapper: FC<ListWrapperProps> = ({ categories, categoryActive, papersData }) => {
  if (categories.length === 0) return null;

  if (categoryActive === "all") {
    return categories.map((category, i) => {
      const categoryLowerCase = category.toLowerCase();

      if (categoryLowerCase === "deleted") return null;
      return <ListWrapperItem category={categoryLowerCase} paperDataRaw={papersData} key={i} />;
    });
  }

  return <ListWrapperItem category={categoryActive} paperDataRaw={papersData} />;
};

export const ListMode: FC = () => {
  const { isLoading, paperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const [categoryActive, setCategoryActive] = useState<string>("all");
  const { push } = useNavigation();

  const onChange = (value: string) => {
    setCategoryActive(value);
  };

  return (
    <List
      searchBarPlaceholder={isLoading ? "Fetching Papers.." : "Search Paper"}
      isLoading={isLoading}
      searchBarAccessory={<PaperSearchBarDropdown categories={categories} isLoading={isLoading} onChange={onChange} />}
      throttle={true}
      actions={
        <ActionPanel>
          <Action title="Create Paper" icon={Icon.Plus} onAction={() => push(<CreatePaper />)} />
        </ActionPanel>
      }
    >
      <ListWrapper categories={categories} categoryActive={categoryActive} papersData={paperDataRaw} />
    </List>
  );
};

PaperSearchBarDropdown.displayName = "PaperSearchBarDropdown";
ListWrapper.displayName = "ListWrapper";
ListWrapperItem.displayName = "ListWrapperItem";
ListMode.displayName = "ListMode";
