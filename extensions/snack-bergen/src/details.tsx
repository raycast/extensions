import { ActionPanel, Detail, Action, useNavigation } from "@raycast/api";
import { decrementAllOrderCount, decrementOrderCount, incrementOrderCount } from "./firebase";
import { getWeekDocId } from "./helpers";
import { useState } from "react";

export default function ItemDetails({ item, orderData }) {

    const { pop } = useNavigation();
    const [orders, setOrders] = useState(orderData.find(order => order.id === item.id)?.count || 0);
  
    const markdownContent = `![${item.title}](${`https://bilder.ngdata.no/${item.imagePath}/large.jpg?raycast-height=320`})`;
    const price = `${item.pricePerUnit}`.replace(".", ",")

    return (
      <Detail
        navigationTitle={item.title}
        markdown={markdownContent}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
                { orders > 0 ? <Detail.Metadata.TagList.Item text={`${orders} Bestilt`} color={"#00FF00"} /> : <Detail.Metadata.TagList.Item text="Ingen i bestilling" color={"#808080"} /> }
                { item.isOutOfStock ? <Detail.Metadata.TagList.Item text="Tomt på lager" color={"#ff0000"} /> : null }
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Navn" text={`${item.title}`} />
            <Detail.Metadata.Label title="Beskrivelse" text={item.subtitle} />
            <Detail.Metadata.Label title="Enhet" text={item.unit} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Pris" text={`${price} kr`} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Legg til" onAction={() => { incrementOrderCount(getWeekDocId(), item); setOrders(orders + 1) } }/>
            { orders > 0 ? <Action title="Ta bort" onAction={() => { decrementOrderCount(getWeekDocId(), item); setOrders(orders - 1) }} shortcut={{ modifiers: ["cmd"], key: "backspace" }} /> : null }
            { orders > 0 ? <Action title="Ta bort alle" onAction={() => { decrementAllOrderCount(getWeekDocId(), item); setOrders(0) }} /> : null }
            <Action title="Tilbake" onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }