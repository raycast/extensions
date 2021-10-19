import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import $ from "cheerio";
import fetch from "node-fetch";

export default function ArticleList() {
  const [currencyPrice, setCurrencyPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false)
 


  const onSearch = (search: string) => {
    

    setIsLoading(true)

    fetchPrice(search).then(price => {
      setCurrencyPrice(price);
      setIsLoading(false)
    });

  }
  return (
    <List isLoading={isLoading}
      throttle
      searchBarPlaceholder="enter the crypto name ... "
      onSearchTextChange={onSearch}>


      <List.Item
        title={currencyPrice}
        // subtitle="Raycast Blog"
        icon={Icon.Star}
      />

    </List>
  );
}



async function fetchPrice(coinName: string) {
  console.log('coinName :', coinName);


  return fetch(`https://coinmarketcap.com/currencies/${coinName}/`)
    .then((r) => r.text())
    .then((html) => {
      const $html = $.load(html);

      const priceResult = $html(".priceValue").text()
      console.log('priceResult :', priceResult);
      if (!priceResult) return '';
      return priceResult

    });

}
