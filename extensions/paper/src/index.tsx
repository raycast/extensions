import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  useNavigation,
  confirmAlert,
  Alert,
  Toast,
  showToast,
} from "@raycast/api";
import { FC, useState } from "react";
import { ReadMode } from "./views/ReadMode";
import { EditMode } from "./views/EditMode";
import { CreateCategory } from "./views/CreateCategory";
import { UpdateCategory } from "./views/UpdateCategory";
import { DeleteCategory } from "./views/DeleteCategory";
import { PaperRawData } from "./types";
import { useGetConfig } from "./hooks/useGetConfig";
import { useGetCategories } from "./hooks/useGetCategories";
import { updateConfigFile } from "./utils/updateConfigFile";

type Categories = Array<string>;

type onDeletePaper = (category: string, index: number) => void;

type PaperSearchBarDropdownProps = {
  onChange: (value: string) => void;
  isLoading: boolean;
  categories: Categories;
};

type ListWrapperItemProps = {
  category: string;
  paperDataRaw: PaperRawData | null;
  onDeletePaper: onDeletePaper;
};

type ListWrapperProps = {
  categories: Categories;
  categoryActive: string;
  papersData: PaperRawData | null;
  onDeletePaper: onDeletePaper;
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

const ListWrapperItem: FC<ListWrapperItemProps> = ({ category, paperDataRaw, onDeletePaper }) => {
  const { push } = useNavigation();

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
          actions={
            <ActionPanel>
              <Action
                title="Read Paper"
                autoFocus={true}
                icon={Icon.List}
                onAction={() => push(<ReadMode content={paper.content} paperName={paper.name} />)}
              />
              <Action
                title="Edit Paper"
                icon={Icon.Pencil}
                onAction={() => push(<EditMode paper={paper} index={i} paperCategory={category} />)}
              />
              <Action
                title="Delete Paper"
                shortcut={{ modifiers: ["cmd"], key: "deleteForward" }}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  onDeletePaper(category, i);
                }}
              />
              <ActionPanel.Section title="Categories">
                <Action
                  title="Create New Category"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  icon={Icon.NewDocument}
                  onAction={() => push(<CreateCategory />)}
                />
                <Action
                  title="Update Category"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  icon={Icon.Switch}
                  onAction={() => push(<UpdateCategory />)}
                />
                <Action
                  title="Delete Category"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => push(<DeleteCategory />)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};

const ListWrapper: FC<ListWrapperProps> = ({ categories, categoryActive, papersData, onDeletePaper }) => {
  if (categories.length === 0) return null;

  if (categoryActive === "all") {
    return categories.map((category, i) => {
      const categoryLowerCase = category.toLowerCase();

      if (categoryLowerCase === "deleted") return null;
      return (
        <ListWrapperItem category={categoryLowerCase} paperDataRaw={papersData} key={i} onDeletePaper={onDeletePaper} />
      );
    });
  }

  return <ListWrapperItem category={categoryActive} paperDataRaw={papersData} onDeletePaper={onDeletePaper} />;
};

export default function Command() {
  const { isLoading, paperDataRaw, setPaperDataRaw } = useGetConfig();
  const categories = useGetCategories(paperDataRaw);
  const [categoryActive, setCategoryActive] = useState<string>("all");

  const onChange = (value: string) => {
    setCategoryActive(value);
  };

  const onDeletePaper = async (paperCategory: string, paperIndex: number) => {
    const userWanteDelete = await confirmAlert({
      title: "Delete Paper",
      message: "Are you sur to delete this paper it will be placed into the Deleted category",
      primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
    });

    if (userWanteDelete === false) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Delete Paper`,
    });

    if (paperCategory === "deleted") {
      toast.style = Toast.Style.Failure;
      toast.title = "Paper already deleted";
      return;
    }

    try {
      const newPaperRawData = { ...paperDataRaw };
      const paper = newPaperRawData[paperCategory].papers[paperIndex];

      newPaperRawData[paperCategory].papers.splice(paperIndex, 1);

      if (!newPaperRawData.deleted) {
        newPaperRawData.deleted = {
          color: "SecondaryText",
          papers: [],
        };
      }

      newPaperRawData.deleted.papers.push(paper);

      await updateConfigFile(newPaperRawData);

      toast.style = Toast.Style.Success;
      toast.title = "Paper Deleted";

      setPaperDataRaw(newPaperRawData);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Oups.. An error occured, please try again";
    }
  };

  return (
    <List
      searchBarPlaceholder={isLoading ? "Fetching Papers.." : "Search Paper"}
      isLoading={isLoading}
      searchBarAccessory={<PaperSearchBarDropdown categories={categories} isLoading={isLoading} onChange={onChange} />}
      throttle={true}
    >
      <ListWrapper
        categories={categories}
        categoryActive={categoryActive}
        papersData={paperDataRaw}
        onDeletePaper={onDeletePaper}
      />
    </List>
  );
}

PaperSearchBarDropdown.displayName = "PaperSearchBarDropdown";
ListWrapper.displayName = "ListWrapper";
ListWrapperItem.displayName = "ListWrapperItem";
