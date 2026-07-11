import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import tinyRelativeDate from "tiny-relative-date";
import type { Model } from "../models/models.model";
import type { HistoryItem } from "../storage/history.storage";
import { addToHistory } from "../storage/history.storage";
import { addFavorite, removeAllItemsFromFavorites, removeItemFromFavorites } from "../storage/favorite.storage";
import Favorites from "../favorites";
import { ModelCardDetail } from "./ModelCardDetail";
import { EntityType } from "../interfaces";

interface ListItemProps {
  model: Model;
  type: EntityType;
  searchTerm?: string;
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  isFavorited: boolean;
  handleFavoriteChange?: () => Promise<void>;
  isViewingFavorites?: boolean;
}

export const ListItem = ({
  model,
  type,
  setHistory,
  isFavorited,
  handleFavoriteChange,
  isViewingFavorites,
}: ListItemProps): JSX.Element => {
  const handleAddToHistory = async () => {
    const history = await addToHistory({ term: model.id, type });
    setHistory?.(history);
    showToast(Toast.Style.Success, `Added ${model.id} to history`);
  };

  const handleAddToFavorites = async () => {
    await addFavorite(model, type);
    showToast(Toast.Style.Success, `Added ${model.id} to favorites`);
    handleFavoriteChange?.();
  };
  const handleRemoveFromFavorites = async () => {
    await removeItemFromFavorites(model, type);
    showToast(Toast.Style.Success, `Removed ${model.id} from favorites`);
    handleFavoriteChange?.();
  };
  const handleRemoveAllFavorites = async () => {
    await removeAllItemsFromFavorites(type);
    showToast(Toast.Style.Success, `Removed ${model.id} from favorites`);
    handleFavoriteChange?.();
  };

  const openActions = {
    openHomepage: (
      <Action.OpenInBrowser
        key="openHomepage"
        url={`https://huggingface.co/${type === EntityType.Model ? `${model.id}` : `datasets/${model.id}`}`}
        title="Open Homepage"
        icon={Icon.Link}
        onOpen={handleAddToHistory}
      />
    ),
    openFiles: (
      <Action.OpenInBrowser
        key="huggingFaceModelPage"
        url={`https://huggingface.co/${model.id}/tree/main`}
        title="Open Hugging Face Model Files"
        icon={Icon.Folder}
        onOpen={handleAddToHistory}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    ),
  };

  const accessories: List.Item.Accessory[] = [
    model.tags.length
      ? {
          icon: Icon.Tag,
          tooltip: model.tags.join(", "),
        }
      : {},
  ];
  if (!isViewingFavorites) {
    accessories.push(
      {
        text: `${model.downloads}`,
        tooltip: `Downloads`,
      },
      {
        icon: Icon.Calendar,
        tooltip: `Last updated: ${tinyRelativeDate(new Date(model.lastModified))}`,
      },
    );
    if (isFavorited) {
      accessories.push({
        icon: Icon.Star,
      });
    }
  }

  return (
    <List.Item
      id={model.id}
      key={model.id}
      title={model.id}
      subtitle={model.pipeline_tag}
      icon={Icon.Box}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            {Object.entries(openActions)
              .map(([, action]) => {
                if (!action) {
                  return null;
                }
                return action;
              })
              .filter(Boolean)}
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            {isFavorited ? (
              <Action
                title="Remove From Favorites"
                onAction={handleRemoveFromFavorites}
                icon={Icon.StarDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                style={Action.Style.Destructive}
              />
            ) : (
              <Action
                title="Add to Favorites"
                onAction={handleAddToFavorites}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            )}
            {isViewingFavorites ? (
              <Action
                title="Remove All Favorites"
                onAction={handleRemoveAllFavorites}
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                style={Action.Style.Destructive}
              />
            ) : (
              <Action.Push
                title="View Favorites"
                target={<Favorites type={type} />}
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            <Action.Push
              title="View Readme"
              target={<ModelCardDetail modelId={model.id} type={type} />}
              icon={Icon.Paragraph}
              shortcut={{ modifiers: ["shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Name"
              content={model.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
