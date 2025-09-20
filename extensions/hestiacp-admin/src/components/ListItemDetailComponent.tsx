import { List } from "@raycast/api";
import { getTextAndIconFromVal } from "../utils";

type ListItemDetailComponentProps = {
  data: {
    [key: string]: string;
  };
};
export default function ListItemDetailComponent({ data }: ListItemDetailComponentProps) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {Object.entries(data).map(([key, val]) => {
            const { text, icon } = getTextAndIconFromVal(val);
            return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
