import { Action, ActionPanel, List, showToast, Toast } from '@raycast/api'
import axios, { AxiosRequestConfig } from 'axios'
import { useState, useEffect } from 'react'

interface Term {
    definition?: string,
    permalink?: string,
    word?: string,
    author?: string
    thumbs_up?: number,
    thumbs_down?: number,
    defid: number
}

export default function UrbanDictionarySearch() {
    const [query, setQuery] = useState<string>('');
    const [terms, setTerms] = useState<Term[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] =  useState<boolean>(false);

    useEffect(() => {
        async function fetchTerms() {
          try {
            if(query) {
                setIsLoading(true)
                let res: Term[] = []
                res = await searchUrbanDictionary(query)
                setIsLoading(false)
                setTerms(res);
            }
          } catch (err: any) {
              setError(err.message ? err.message : 'Something Went Wrong')
          }
        }
    
        fetchTerms();
      }, [query]);

    if(error) {
        showToast({
            title: 'An error occured',
            message: error,
            style: Toast.Style.Failure,
        })
    }


    return (
        <List 
            onSearchTextChange={(text) => setQuery(text)}
            throttle
            searchBarPlaceholder='Enter term to search UD...'
            isLoading={isLoading}
        >
            {
                terms ? terms.map((item, idx) =>{
                    return <List.Item 
                        title={item.definition || ''}
                        subtitle={item.author}
                        accessoryTitle={`👍  ${item.thumbs_up} 👎 ${item.thumbs_down}`}
                        actions={
                            <ActionPanel title={item.definition || ''}>
                                {item.permalink && <Action.OpenInBrowser url={item.permalink}/>}
                                <Action.CopyToClipboard content={item.definition || ''}/>
                            </ActionPanel>
                        }
                        key={idx}
                    />
                    }) : null
            }

        </List>
    )
}

const searchUrbanDictionary = async (term?: string):Promise<Term[]> => {
    
    var options: AxiosRequestConfig = {
       method: 'GET',
       url: `http://api.urbandictionary.com/v0/define?term=${term}`,
     };

    const results = await axios.request(options);
    return processResults(results.data.list)
   }

const processResults = (results: Term[]) : Term[] => {
    results.forEach((result, i) => {
        result.definition = result.definition ? result.definition.replaceAll('[', '').replaceAll(']', '') : ''
    })
    return results
}