import { ActionPanel, useNavigation, Icon, List, OpenInBrowserAction, Detail } from "@raycast/api";
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
  slug: string,
  symbol: string
}

type FuzzySortResult = {
  obj: CryptoList,
  score: number
}

type CryptoInfo = {
  currencyPrice: string,
  priceDiff: string
  name: string,
  slug: string
}

export default function ArticleList() {
  const [currentSearchText,setCurrehtSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoList, setCryptoList] = useState([])
  const [fuzzyResult, setFuzzyResult] = useState([])


  const { push } = useNavigation();


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

        const cryptoList = data.cryptoCurrencyMap.map(({ slug, name, symbol }: CryptoList) => ({ slug, name, symbol: symbol.toLowerCase() }))
        writeLIstInToFile({ timestamp: status.timestamp, cryptoList: cryptoList })
      })
    })
  }, [])

  const onSelectCrypto = async (searchText: string) => {
    const priceInfo = await fetchPrice(searchText) 
    setIsLoading(false);
    return priceInfo
  }

  const onSearchChange = (search:string)=>{
    setIsLoading(true)
    setCurrehtSearchText(search);

    const fuzzyResult = fuzzysort.go(search, cryptoList, { key: 'symbol' })

    setFuzzyResult(fuzzyResult)
  } 
  
  return (
    <List isLoading={isLoading}
      throttle
      searchBarPlaceholder="Enter the crypto name"
      onSearchTextChange={onSearchChange}>

      {
        fuzzyResult.length === 0 ?
          <List.Item title="" /> :
          fuzzyResult.map((result: FuzzySortResult) => {
            const { name,slug } = result.obj

            return (
              <List.Item
                key={name}
                title={name}
                icon={Icon.Star}
                actions={
                  <ActionPanel>
                    <ActionPanel.Item title="Pop" onAction={() => {
                      onSelectCrypto(slug).then(({ currencyPrice = '', priceDiff = '' })=>{

                      push(
                        <CryptoDetail 
                            currencyPrice={currencyPrice} 
                            priceDiff={priceDiff}
                            name={name}
                            slug={slug}/>
                        )  
                      }) 
                      
                    }}/>
                  </ActionPanel>
                }
              />
            )
          })
      }

    </List>
  );
}




function CryptoDetail({ currencyPrice, priceDiff,name,slug }: CryptoInfo) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={name}
      markdown={`## ${currencyPrice} \n ### ${priceDiff}`}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Pop" onAction={pop} />
          <OpenInBrowserAction url={`${BASE_URL}${slug}`} />
        </ActionPanel>
      }
    />
  )
}


async function fetchPrice(slug: string) {
  return fetch(`${BASE_URL}${slug}/`)
    .then((r) => r.text())
    .then((html) => {
      const $html = $.load(html);

      const priceValue = $html(".priceValue")

      // get price diff element className 
      const priceDirectionClassName = $html(".priceValue + span > span[class^=icon-Caret]").attr('class');
      const priceDirection = priceDirectionClassName && priceDirectionClassName.split('-').includes('up') ? '+' : '-'
      const priceDiffValue = priceValue.next("span").text()
      
      const priceDiffText = `${priceDirection} ${priceDiffValue}`

      const priceValueText = priceValue.text()
      if (!priceValueText) return { priceValueText: '', priceDiffText: '', coinName: '' };


 
      return { currencyPrice:priceValueText, priceDiff:priceDiffText, slug }
    });

}
