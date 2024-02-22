import { List } from "@raycast/api";
import { Jar } from "../../types";
import { formatCurrency } from "../../utils";

export default function JarDetail(props: { jar: Jar }) {
  const { jar } = props;
  const sendUrl = `https://send.monobank.ua/${jar.sendId}`;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={jar.id} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Title" text={jar.title} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Description" text={jar.description} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Currency"
            text={`${jar.currency.flag} ${jar.currency.code}, ${jar.currency.name}`}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Balance" text={formatCurrency(jar.balance, jar.currency.code)} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Goal"
            text={jar.goal ? formatCurrency(jar.goal, jar.currency.code) : "No goal"}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link title="Top Up Page URL" text={sendUrl} target={sendUrl} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
