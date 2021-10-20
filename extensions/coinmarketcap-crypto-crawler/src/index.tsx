import { ActionPanel, CopyToClipboardAction, PasteAction, Icon, List, OpenInBrowserAction, environment, ListItem } from "@raycast/api";
import { useState, useEffect } from "react";
import $ from "cheerio";
import fetch from "node-fetch";
const { fetchAllCrypto } = require('./api')
const { writeLIstInToFile, getListFromFile } = require('./utils')
const fuzzysort = require('fuzzysort') 


const BASE_URL = 'https://coinmarketcap.com/currencies/'

type PriceInfo = {
  priceValueText: string;
  priceDiffText: string;
  coinName: string;
};



type ResultData = {
  data: {
    cryptoCurrencyMap: []
  },
  status: {
    timestamp: string
  }
}

type CryptoList = { 
  name: string,
  slug:string,
  symbol:string 
}

export default function ArticleList() {
  const [coinName, setCoinName] = useState('')
  const [currencyPrice, setCurrencyPrice] = useState('');
  const [priceDiff, setPriceDiff] = useState('');
  const [notFound, setNotFound] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoList, setCryptoList] = useState([])

  const [fuzzyResult, setFuzzyResult ] = useState([]) 


  useEffect(() => {

    getListFromFile((err: string, data: string) => {
      if (err) {
        console.error(err)
        return
      }

      const { cryptoList: cryptoListFromFile } = JSON.parse(data)

      if (!!cryptoListFromFile) {
        setCryptoList(cryptoListFromFile)
        return
      }
      // fetch crypto list mapping if there's no data exist in the local file
      // the api has an limit num per request. 
      fetchAllCrypto({ limit: 10000, start: 1 }).then(({ data: resultData }: { data: ResultData }) => {
        const { data, status } = resultData

        const cryptoList = data.cryptoCurrencyMap.map(({ slug, name,symbol }:CryptoList) => ({ slug, name, symbol:symbol.toLowerCase() }))
        writeLIstInToFile({ timestamp: status.timestamp, cryptoList: cryptoList })
      })
    })
  }, [])




  const onSearch = (search: string) => {
    setIsLoading(true)
    setNotFound(false)
    
    const defaultCryptoResult = {
      slug:'',
      name:'', 
      symbol:''
    }


    
    const { slug: resultSlug }:CryptoList  = cryptoList.find(({ symbol }:CryptoList ) => symbol.toLowerCase() === search.toLowerCase()) ||defaultCryptoResult
    
    const fuzzyResult = fuzzysort.go(search, cryptoList, {key: 'symbol'} ) 
    console.log('fuzzyResult :', fuzzyResult);
    setFuzzyResult(fuzzyResult)

    const searchText =  resultSlug || search 

    fetchPrice(searchText).then((priceInfo: PriceInfo) => {
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

        {

          fuzzyResult.length ===0 ? 
          <List.Item title=""  /> :
          fuzzyResult.map(result=> {
            const {name} = result.obj
            
            return (
              <List.Item 
                title={name}
                icon={Icon.Star} />
            )
          })
        }
      
      {/* <List.Item
        title={notFound ? 'Crypto Not Found.' : currencyPrice}
        subtitle={priceDiff}
        icon={Icon.Star}
        actions={
          <ActionPanel>
            <OpenInBrowserAction url={`${BASE_URL}${coinName}`} />
          </ActionPanel>
        }

      /> */}

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
