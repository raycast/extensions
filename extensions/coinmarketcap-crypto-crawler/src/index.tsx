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

type SearchResult = {
  obj: CryptoList,
  score: number,
  currencyPrice?: string,
  priceDiff?: string
}

type CryptoInfo = {
  currencyPrice: string,
  priceDiff: string
  name: string,
  slug: string
}

export default function CryptoList() {
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoList, setCryptoList] = useState<CryptoList[]>([])
  const [searchResult, setSearchResult] = useState<SearchResult[]>([])

  useEffect(() => {

    getListFromFile((err: string, data: string) => {
    

      if (err) {
        console.error('ReadListError:' + err)
        return 
      }

      if(!data){
        // fetch crypto list mapping if there's no data exist in the local file
        // the api has an limit num per request. 
        fetchAllCrypto({ limit: 10000, start: 1 }).then(({ data: resultData }: { data: ResultData }) => {
          const { data, status } = resultData

          const cryptoList = data.cryptoCurrencyMap.map(({ slug, name, symbol }: CryptoList) => ({ slug, name, symbol: symbol.toLowerCase() }))

          writeLIstInToFile({
            timestamp: status.timestamp,
            cryptoList: cryptoList
          }, (writeFileError: string) => {
            if (writeFileError) {
              console.error('WriteFileError:' + writeFileError)
              return
            }
            setCryptoList(cryptoList)
          })
        })

      } else {
        const { cryptoList: cryptoListFromFile } = JSON.parse(data)

        if (!!cryptoListFromFile) {
          setCryptoList(cryptoListFromFile)
        }
      }


    })
  }, [])

  const onSelectCrypto = async (searchText: string) => {
    const priceInfo = await fetchPrice(searchText)
    setIsLoading(false);
    return priceInfo
  }

  const onSearchChange = (search: string) => {
    setIsLoading(true)
    const fuzzyResult = fuzzysort.go(search, cryptoList, { key: 'symbol' })

    setSearchResult(fuzzyResult)
  }
  const onSelectChange = (id?: string) => {
    if (!id) return;

    const [slug] = id.split('_')
    const targetCryptoIndex = searchResult.findIndex(({ obj }) => obj.slug === slug)
    const targetCrypto = searchResult.find(({ obj }) => obj.slug === slug) 

    if (targetCrypto && !!targetCrypto.currencyPrice) return

    onSelectCrypto(slug).then(({ currencyPrice = '', priceDiff = '' }) => {

      setSearchResult(prev => {
        const temp = [...prev]

        if(!targetCrypto) return prev
        
        temp.splice(targetCryptoIndex,1 ,{ ...targetCrypto,currencyPrice,priceDiff} )
        return temp
      })
    })


  }


  return (
    <List isLoading={isLoading}
      throttle
      searchBarPlaceholder="Enter the crypto name"
      onSearchTextChange={onSearchChange}
      onSelectionChange={onSelectChange}>

      {
        searchResult.length === 0 ?
          null :
          searchResult.map((result, index: number) => {
            const {currencyPrice='', priceDiff=''} = result
            const { name, slug, symbol} = result.obj

            return (
              <List.Item
                id={`${slug}_${symbol}_${index}`}
                key={name}
                title={name}
                subtitle={currencyPrice}
                icon={Icon.Star}
                accessoryTitle={priceDiff}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction url={`${BASE_URL}${slug}`} />
                  </ActionPanel>
                }          
              />
            )
          })
      }

    </List>
  );
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



      return { currencyPrice: priceValueText, priceDiff: priceDiffText, slug }
    });

}
