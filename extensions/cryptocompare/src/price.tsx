import { List, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchData, cryptoList, addFavoriteCrypto, removeFavoriteCrypto } from "./api";
import { delay } from "./utils";

interface Data {
  icon: string;
  name: string;
  price: string;
  markets: string;
  favorite?: boolean;
}

export default function Command() {
  let changeNumber = 0;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [priceData, setPriceData] = useState<Data[]>([]);

  useEffect(() => {
    async function fetchDataAsync() {
      const newPriceData = await fetchData("");
      setPriceData(newPriceData);
      setIsLoading(false);
    }

    fetchDataAsync();
  }, []);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={async (SearchText) => {
        // 实现延迟搜索
        changeNumber += 1;
        const currentChangeNumber = changeNumber;
        await delay(1200);

        // 过滤非正常搜索 + 延迟搜索
        if (
          SearchText === "" ||
          cryptoList.includes(SearchText.toUpperCase()) ||
          currentChangeNumber !== changeNumber
        ) {
          return;
        }

        setIsLoading(true);
        setPriceData(await fetchData(SearchText));
        setIsLoading(false);
      }}
      throttle={true}
      searchBarPlaceholder="Search for prices of digital coins"
    >
      {priceData.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          icon={{ source: item.icon }}
          accessories={item.favorite ? [{ icon: "favorited.png", tooltip: "Favorited" }] : []}
          subtitle={{ value: item.price, tooltip: item.markets }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Price" content={item.price} onCopy={() => item.price} />
              <Action
                title={item.favorite ? "Remove From Favorite" : "Add To Favorite"}
                icon={item.favorite ? "remove.png" : "favorite.png"}
                onAction={async () => {
                  setPriceData((priceData) =>
                    priceData.map((i) => {
                      if (i.name === item.name) {
                        return { ...i, favorite: !item.favorite };
                      }
                      return i;
                    })
                  );
                  if (item.favorite) {
                    await removeFavoriteCrypto(item.name);
                  } else {
                    addFavoriteCrypto(item.name);
                  }
                }}
              />

              <Action
                title="Refresh"
                icon="refresh.png"
                onAction={async () => {
                  setIsLoading(true);
                  setPriceData(await fetchData(""));
                  setIsLoading(false);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
