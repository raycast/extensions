import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { useStoreCard } from "../hooks/useRecent";
import { PermMap } from "../util/mapping";
import { ICard } from "../util/types";

const CardDetail = ({ card }: { card: ICard }) => {
  useStoreCard(card);

  return (
    <Detail
      navigationTitle={card.data.name}
      markdown={card.data.markup}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy HTML" content={card.data.html} icon={Icon.Clipboard} />
          <Action.CopyToClipboard title="Copy Markdown" content={card.data.markup} icon={Icon.Clipboard} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {card.data.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {card.data.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {card.membership.personal_tags.length > 0 && (
            <Detail.Metadata.TagList title="Personal Tags">
              {card.membership.personal_tags.map((personalTag) => (
                <Detail.Metadata.TagList.Item key={personalTag} text={personalTag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Label title="Created Date" text={card.data.created_when} />
          <Detail.Metadata.Label title="Edited Date" text={card.data.modified_when} />
          <Detail.Metadata.Label title="Role" text={PermMap[card.membership.perms.toString()]} />
        </Detail.Metadata>
      }
    />
  );
};

export default CardDetail;
