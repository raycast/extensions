import { ActionPanel, Action, Icon, useNavigation, Toast, showToast, confirmAlert, Alert } from "@raycast/api";
import { FC } from "react";
import { Mode, Paper } from "../types";
import { ReadMode } from "../views/ReadMode";
import { ListMode } from "../views/ListMode";
import { CreateCategory } from "../views/CreateCategory";
import { DeleteCategory } from "../views/DeleteCategory";
import { useGetConfig } from "../hooks/useGetConfig";
import { updateConfigFile } from "../utils/updateConfigFile";
import { UpdateCategory } from "../views/UpdateCategory";
import { CreatePaper } from "../views/CreatePaper";
import { EditMode } from "../views/EditMode";

type ActionsProps = {
  mode: Mode;
  paper: Paper;
  category: string;
  index: number;
};

export const Actions: FC<ActionsProps> = ({ mode, paper, category, index }) => {
  const { paperDataRaw } = useGetConfig();
  const { push } = useNavigation();

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

      push(<ListMode />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Oups.. An error occured, please try again";
    }
  };

  return (
    <ActionPanel>
      {mode === "list" ? (
        <>
          <Action
            title="Read Paper"
            autoFocus={true}
            icon={Icon.List}
            onAction={() => push(<ReadMode paper={paper} category={category} index={index} />)}
          />
          <Action
            title="Edit Paper"
            icon={Icon.Pencil}
            onAction={() => push(<EditMode paper={paper} index={index} paperCategory={category} />)}
          />
          <Action title="Create Paper" icon={Icon.Plus} onAction={() => push(<CreatePaper />)} />
        </>
      ) : (
        <>
          <Action
            title="Edit Paper"
            icon={Icon.Pencil}
            onAction={() => push(<EditMode paper={paper} index={index} paperCategory={category} />)}
          />
          <Action title="List Papers" icon={Icon.List} onAction={() => push(<ListMode />)} />
          <Action title="Create Paper" icon={Icon.Plus} onAction={() => push(<CreatePaper />)} />
        </>
      )}
      <Action
        title="Create New Category"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.NewDocument}
        onAction={() => push(<CreateCategory />)}
      />
      <Action
        title="Update Category"
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        icon={Icon.Switch}
        onAction={() => push(<UpdateCategory />)}
      />
      <ActionPanel.Section title="Danger zone">
        <Action
          title="Delete Category"
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => push(<DeleteCategory />)}
        />
        <Action
          title="Delete Paper"
          shortcut={{ modifiers: ["cmd"], key: "deleteForward" }}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => {
            onDeletePaper(category, index);
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

Actions.displayName = "PaperActions";
