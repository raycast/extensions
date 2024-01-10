import { Action, Icon, showToast } from "@raycast/api";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { FavoritableObject } from "../../lib/common/types";
import { Command, isCommand } from "../../lib/commands/types";
import { Model, isModel } from "../../lib/models/types";
import { updateModel } from "../../lib/models";
import { updateCommand } from "../../lib/commands";
import { Chat, isChat } from "../../lib/chats/types";
import { updateChat } from "../../lib/chats";

type ToggleFavoriteActionProps = {
  object: FavoritableObject;
  settings: AdvancedSettings;
  revalidateObjects: () => Promise<void> | void;
};

export default function ToggleFavoriteAction(props: ToggleFavoriteActionProps) {
  const { object, settings, revalidateObjects } = props;
  if (!isActionEnabled("ToggleFavoriteAction", settings)) {
    return null;
  }

  return (
    <Action
      title={object.favorited ? "Remove From Favorites" : "Add To Favorites"}
      icon={object.favorited ? Icon.StarDisabled : Icon.Star}
      shortcut={getActionShortcut("ToggleFavoriteAction", settings)}
      onAction={async () => {
        const updatedObject = { ...object, favorited: !object.favorited };
        if (isCommand(object)) {
          await updateCommand(object, updatedObject as Command);
        } else if (isModel(object)) {
          await updateModel(object, updatedObject as Model);
        } else if (isChat(object)) {
          updateChat(object, updatedObject as Chat);
        }

        await revalidateObjects();
        await showToast({ title: object.favorited ? `Removed From Favorites` : `Added To Favorites` });
      }}
    />
  );
}
