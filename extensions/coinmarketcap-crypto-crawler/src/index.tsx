import { ActionPanel, CopyToClipboardAction, PasteAction, Icon, List, OpenInBrowserAction, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import $ from "cheerio";
import fetch from "node-fetch";
const {fetchAllCrypto} = require('./api') 


const {writeLIstInToFile, getListFromFile} = require( './utils')


const BASE_URL = 'https://coinmarketcap.com/currencies/'

type PriceInfo = {
  priceValueText: string;
  priceDiffText: string;
  coinName: string;
};



type ResultData =  {
  data: {
    cryptoCurrencyMap: []
  }, 
  status: {
    timestamp: string 
  }
}

export default function ArticleList() {
  const [coinName, setCoinName] = useState('')
  const [currencyPrice, setCurrencyPrice] = useState('');
  const [priceDiff, setPriceDiff] = useState('');
  const [notFound, setNotFound] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoList,setCryptoList] = useState([])


  useEffect(()=> {

    getListFromFile((err:string, data: string) => {
      if (err) {
        console.error(err)
        return
      }
      const {cryptoListFromFile} = JSON.parse(data)
      
      if(!cryptoListFromFile)  return 
      setCryptoList(cryptoListFromFile)
    })
  },[]) 

  useEffect(() => {
    if(!!cryptoList) return 

    fetchAllCrypto({ limit: 10000, start: 1 }).then(({data:resultData}: {data: ResultData}) => {
      const { data,status } = resultData  
      writeLIstInToFile({timestamp:  status.timestamp,cryptoList: data.cryptoCurrencyMap })
    })

  }, [cryptoList])


  const onSearch = (search: string) => {
    setIsLoading(true)
    setNotFound(false)

    fetchPrice(search).then((priceInfo: PriceInfo) => {
      const { priceValueText = '', priceDiffText = '', coinName = '' } = priceInfo;
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
      searchBarPlaceholder="Enter the crypto name"
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
      if (!priceValueText) return { priceValueText: '', priceDiffText: '', coinName: '' };

      return { priceValueText, priceDiffText, coinName }
    });

}
