import { Detail, List } from "@raycast/api";
import { History } from "../type";

export const AnswerDetailView = (props: { item: History }) => {
  const { item } = props;

  const metadata = item.metadata
    ?.filter((i) => i !== undefined)
    ?.map(({ title, text }) => <Detail.Metadata.Label title={title} text={text} />);

  return (
    <List.Item.Detail
      markdown={item.answer}
      metadata={metadata ? <Detail.Metadata>{...metadata}</Detail.Metadata> : undefined}
    />
  );
};
