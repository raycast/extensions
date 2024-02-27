import { List, Icon } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

export default function Command() {
  const [lastPrice, setLastPrice] = useState<string>("");
  const [btcPrice, setBtcPrice] = useState<any>(null); // Change the type to any

  useEffect(() => {
    const fetchData = () => {
      const url = "https://dapi.binance.com/dapi/v1/ticker/24hr?symbol=BTCUSD_PERP";
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const dataArray = Array.isArray(data) ? data : []; // Ensure data is an array
          const firstElement = dataArray[0]; // Extract the first element from the array
          const price = parseFloat(firstElement?.lastPrice).toFixed(1); // Use optional chaining to access lastPrice
          const btcPrice = firstElement;
          setLastPrice(price);
          setBtcPrice(btcPrice);
          console.log(price);
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    };

    fetchData(); // Fetch data immediately

    const intervalId = setInterval(fetchData, 3000); // Fetch data every 3 seconds

    return () => {
      clearInterval(intervalId); // Clean up the interval when the component is unmounted
    };
  }, []);

  return (
    <List isShowingDetail>
      <List.Item
        icon={Icon.Stars}
        title="Binance BTC"
        subtitle={lastPrice}
        detail={
          <List.Item.Detail markdown={`\`\`\`json\n${JSON.stringify(btcPrice, null, 2)}\n\`\`\``} /> // Display the JSON response in markdown
        }
      />
    </List>
  );
}
