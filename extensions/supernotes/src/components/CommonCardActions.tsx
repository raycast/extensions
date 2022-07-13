import { Action, Icon } from "@raycast/api";

import useJunk from "hooks/useJunk";
import { useRecentRemover } from "hooks/useRecent";
import { ICard } from "utils/types";

interface CommonCardActionsProps {
  card: ICard;
  refreshList?: () => void;
}

const CommonCardActions = ({ card, refreshList }: CommonCardActionsProps) => {
  const { found, removeFromRecents } = useRecentRemover(card);
  const removeFromRecentsAndList = () => {
    removeFromRecents();
    refreshList && refreshList();
  };

  const { junk } = useJunk(removeFromRecentsAndList);

  return (
    <>
      <Action.CopyToClipboard title="Copy Markdown" icon={Icon.Clipboard} content={card.data.markup} />
      <Action.CopyToClipboard title="Copy HTML" icon={Icon.Clipboard} content={card.data.html} />
      <Action title="Junk Card" icon={Icon.Trash} onAction={() => junk(card.data.id)} />
      {found && (
        <Action title="Remove from Recently Viewed" icon={Icon.XmarkCircle} onAction={removeFromRecentsAndList} />
      )}
    </>
  );
};

export default CommonCardActions;
