import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { useState, useEffect } from "react";
import $ from "cheerio";
import fetch from "node-fetch";
import { fetchAllCrypto } from './api';
import { writeListInToFile, getListFromFile, CRYPTO_LIST_PATH } from './utils';
import fuzzysort from 'fuzzysort';
import fs from 'fs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);


const BASE_URL = 'https://coinmarketcap.com/currencies/'
import { CryptoList, SearchResult } from './types'


export default function CryptoList() {
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoList, setCryptoList] = useState<CryptoList[]>([])
  const [searchResult, setSearchResult] = useState<SearchResult[]>([])

  useEffect(() => {

    getListFromFile((err, data) => {

      if (err) {
        console.error('ReadListError:' + err)
        return
      }

      if (!data) {
        // fetch crypto list mapping if there's no data exist in the local file
        // the api has an limit num per request. 
        fetchAllCrypto({ limit: 10000, start: 1 }).then(({ data: resultData }) => {
          const { data, status } = resultData

          const cryptoList = data.cryptoCurrencyMap.map(({ slug, name, symbol }) => ({ slug, name, symbol: symbol.toLowerCase() }))

          writeListInToFile({
            timestamp: status.timestamp,
            cryptoList: cryptoList
          }, (writeFileError) => {
            if (writeFileError) {
              console.error('WriteFileError:' + writeFileError)
              return
            }

            setCryptoList(cryptoList)
          })
        })

      } else {
        const now = dayjs();
        const { cryptoList: cryptoListFromFile, timestamp } = JSON.parse(data)
        const fileCachedTimeDiff = now.diff(dayjs(timestamp), 'month')

        //Remove cache file if it has been more than 3 month since last time saved.
        if (fileCachedTimeDiff >= 3) {
          fs.unlink(CRYPTO_LIST_PATH, (err) => {
            if (err) throw err;
            console.log('Crypto list cache has been cleared.');
          });
        }


        if (cryptoListFromFile) {
          setCryptoList(cryptoListFromFile)
        }
      }


    })
  }, [])

  const onSelectCrypto = async (searchText: string) => {
    setIsLoading(true)
    const priceInfo = await fetchPrice(searchText)

    // prevent react to batch setting the loading status.
    setTimeout(() => setIsLoading(false),0)
    
    return priceInfo
  }

  const onSearchChange = (search: string) => {
    setIsLoading(true)

    const fuzzyResult = fuzzysort.go(search, cryptoList, { keys: ['symbol', 'name'] })
    const transformedFuzzyResult = fuzzyResult.map(result => ({ obj: result.obj }))

    if(!transformedFuzzyResult.length){
      setIsLoading(false);  
    }

    setSearchResult(transformedFuzzyResult)
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

        if (!targetCrypto) return prev

        temp.splice(targetCryptoIndex, 1, { ...targetCrypto, currencyPrice, priceDiff })
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
            const { currencyPrice = '', priceDiff = '' } = result
            const { name, slug, symbol } = result.obj

            return (
              <List.Item
                id={`${slug}_${symbol}_${index}`}
                key={`${name}_${index}`}
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
