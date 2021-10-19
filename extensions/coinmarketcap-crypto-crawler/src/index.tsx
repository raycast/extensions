import { ActionPanel, CopyToClipboardAction, PasteAction, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { useState, useEffect } from "react";
import $ from "cheerio";
import fetch from "node-fetch";

const BASE_URL =  'https://coinmarketcap.com/currencies/'
export default function ArticleList() {
  const [coinName, setCoinName] = useState('')
  const [currencyPrice, setCurrencyPrice] = useState('');
  const [priceDiff, setPriceDiff] = useState('');
  const [notFound, setNotFound] = useState(false)
  const [isLoading, setIsLoading] = useState(false)



  const onSearch = (search: string) => {
    setIsLoading(true)
    setNotFound(false)

    fetchPrice(search).then(({ priceValueText = '', priceDiffText = '',coinName='' }) => {
      setCurrencyPrice(priceValueText);
      setPriceDiff(priceDiffText);
      setCoinName(coinName);
      if (!priceValueText) setNotFound(true)
      setIsLoading(false)
    });

  }
  return (
    <List isLoading={isLoading}
      throttle
      searchBarPlaceholder="enter the crypto name ... "
      onSearchTextChange={onSearch}>


      <List.Item
        title={notFound ? 'Crypto Not Found.' : currencyPrice}
        subtitle={priceDiff}
        icon={Icon.Star}
        actions={
          <ActionPanel> 
                       <OpenInBrowserAction url={`${BASE_URL}${coinName}`} />  
          </ActionPanel>
        }

      />

    </List>
  );
}



async function fetchPrice(coinName: string) {
  return fetch(`${BASE_URL}${coinName}/`)
    .then((r) => r.text())
    .then((html) => {
      const $html = $.load(html);

      const priceValue = $html(".priceValue")

      const priceDirectionClassName = $html(".priceValue + span > span[class^=icon-Caret]").attr('class');
      const priceDirection = priceDirectionClassName && priceDirectionClassName.split('-').includes('up') ? '+' : '-'
      const priceDiffValue = priceValue.next("span").text()

      const priceDiffText = `${priceDirection} ${priceDiffValue}`

      const priceValueText = priceValue.text()
      if (!priceValueText) return undefined;

      return { priceValueText, priceDiffText, coinName }
    });

}
