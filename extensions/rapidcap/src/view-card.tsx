import { Detail, Icon, Action } from "@raycast/api";
import { Card } from "./types";

function ViewCardAction(props: { card: Card }) {
  const { card } = props;

  return <Action.Push icon={Icon.Pencil} title="View Card" target={<ViewCardDetail card={card} />} />;
}

function ViewCardDetail(props: { card: Card }) {
  const { card } = props;

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
    />
  );
}

export default ViewCardAction;
