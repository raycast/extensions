import { Action, Icon, popToRoot } from "@raycast/api";

import useJunk from "hooks/useJunk";
import { useRecentRemover } from "hooks/useRecent";
import { SUPERNOTES_VIEW_URL } from "utils/defines";
import { ICard } from "utils/types";

interface CommonCardActionsProps {
  card: ICard;
  removeFromList?: (cardId: string) => void;
}

const CommonCardActions = ({ card, removeFromList }: CommonCardActionsProps) => {
  const { found, removeFromRecents } = useRecentRemover(card);
  const remove = () => {
    removeFromRecents();
    if (removeFromList) {
      removeFromList(card.data.id);
    } else {
      popToRoot();
    }
  };

  const { junk } = useJunk(remove);

  return (
    <>
      <Action.OpenInBrowser url={`${SUPERNOTES_VIEW_URL}/${card.data.id}/`} />
      <Action.CopyToClipboard
        title="Copy Markdown"
        icon={Icon.Clipboard}
        content={card.data.markup}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      <Action.CopyToClipboard
        title="Copy HTML"
        icon={Icon.Clipboard}
        content={card.data.html}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <Action
        title="Junk Card"
        icon={Icon.Trash}
        onAction={() => junk(card.data.id)}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
      {found && <Action title="Remove from Recently Viewed" icon={Icon.XmarkCircle} onAction={remove} />}
    </>
  );
};

export default CommonCardActions;
