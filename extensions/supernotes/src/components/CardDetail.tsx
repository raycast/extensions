import { ActionPanel, Detail } from "@raycast/api";

import CommonCardActions from "~/components/CommonCardActions";
import { useStoreCard } from "~/hooks/useRecent";
import { PermMap } from "~/utils/mapping";
import { ICard } from "~/utils/types";

const CardDetail = ({ card }: { card: ICard }) => {
  useStoreCard(card);

  return (
    <Detail
      navigationTitle={card.data.name}
      markdown={card.data.markup}
      actions={
        <ActionPanel>
          <CommonCardActions card={card} />
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
