import { Detail, Icon, Action, ActionPanel, useNavigation } from "@raycast/api";
import { Card } from "./types";
import DeleteCardAction from "./delete-card";
import EditCardAction from "./edit-card";

function ViewCardAction(props: {
  card: Card;
  onEdit: ({ question, answer, tag }: Card) => void;
  onDelete: () => void;
}) {
  const { card } = props;

  return (
    <Action.Push
      icon={Icon.AppWindowSidebarRight}
      title="View Card"
      target={<ViewCardDetail card={card} onEdit={props.onEdit} onDelete={props.onDelete} />}
    />
  );
}

function ViewCardDetail(props: {
  card: Card;
  onEdit: ({ question, answer, tag }: Card) => void;
  onDelete: () => void;
}) {
  const { card, onEdit, onDelete } = props;
  const { pop } = useNavigation();

  const markdown = `# ${card.question}\n\n${card.answer}`;

  return (
    <Detail
      navigationTitle="View Card Details"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Tags">
            <Detail.Metadata.TagList.Item text={card.tag} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <EditCardAction
            card={card}
            onEdit={(updatedCard) => {
              onEdit(updatedCard);
              pop();
            }}
          />
          <DeleteCardAction
            onDelete={() => {
              onDelete();
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default ViewCardAction;
