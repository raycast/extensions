import { Action, Icon, popToRoot } from "@raycast/api";

import useJunk from "~/hooks/useJunk";
import { useRecentRemover } from "~/hooks/useRecent";
import { SUPERNOTES_APP_CUSTOM_SCHEME } from "~/utils/defines";
import { ICard } from "~/utils/types";

import CardDetail from "./CardDetail";

interface CommonCardActionsProps {
  card: ICard;
  removeFromList?: (cardId: string) => void;
}

export const ViewCardAction = ({ card }: { card: ICard }) => {
  return <Action.Push title="View Card" icon={Icon.Window} target={<CardDetail card={card} />} />;
};

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
      <Action.OpenInBrowser
        title="Open in Supernotes"
        icon={Icon.ArrowNe}
        url={`${SUPERNOTES_APP_CUSTOM_SCHEME}?preview=${card.data.id}`}
      />
      <Action.CopyToClipboard
        title="Copy Markdown"
        icon={Icon.QuoteBlock}
        content={card.data.markup}
      />
      <Action.CopyToClipboard title="Copy HTML" icon={Icon.CodeBlock} content={card.data.html} />
      <Action title="Junk Card" icon={Icon.Trash} onAction={() => junk(card.data.id)} />
      {found && (
        <Action title="Remove from Recently Viewed" icon={Icon.XMarkCircle} onAction={remove} />
      )}
    </>
  );
};

export default CommonCardActions;
