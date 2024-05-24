import { ActionPanel, Detail, Action, useNavigation, List } from "@raycast/api";
import { decrementAllOrderCount, decrementOrderCount, incrementOrderCount } from "./firebase";
import { getWeekDocId } from "./helpers";
import { useState } from "react";
import ItemDetails from "./details";

export default function OrderDetails({ item, orderData }) {

    const { pop, push } = useNavigation();
    const [orders, setOrders] = useState(orderData.find(order => order.id === item.id)?.count || 0);
  
    const markdownContent = `![${item.title}](${`https://bilder.ngdata.no/${item.imagePath}/large.jpg?raycast-height=320`})`;
    const price = `${item.pricePerUnit}`.replace(".", ",")

    return (
    <List
      navigationTitle="Bestilling"
    >
      {orderData.map((item) => (
        <List.Item
          key={item}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{text: `${item.count}`}]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Åpne i nettleser" url={`https://meny.no/varer${item.slugifiedUrl}`} />
              <Action title="Gå til vare" onAction={() => push(<ItemDetails item={item} orderData={orderData} />)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
    );
  }