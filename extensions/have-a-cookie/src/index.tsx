import { 
  ActionPanel, 
  PushAction, 
  CopyToClipboardAction, 
  Detail, 
  PasteAction, 
  List, 
  OpenInBrowserAction, 
  showToast, 
  ToastStyle ,
} from "@raycast/api";
import { useState, useEffect } from "react";

const chrome = require("./util/chrome-cookie-helper");

export default function DomainList() { 
  const { isLoading, error, domains } = useDomainSearch();

  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder="Filter by domain">
      {domains?.map((domain, i) => (
        <DomainListItem key={"domain-"+i} domain={domain} />
      ))}
    </List>
  );  
}


export function CookieList(props: { domain_name: string }) {
  const domain_name = props.domain_name;
  const { isLoading, error, cookies } = useCookieSearch(domain_name)

  

  var requestHeaderCookie = '';
  cookies?.forEach(function (cookie){
    requestHeaderCookie+=cookie.name+'='+cookie.value+';'
  })

  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder="Filter cookie by name"
      navigationTitle={'Cookies from '+domain_name}
      >
        <List.Section title="Combined Cookie">
          <List.Item
            title={"Cookie Box"}
            accessoryTitle="Request Header Cookie"
            icon="📦"
            actions={
              <ActionPanel title="Cookie Box">   
                <CopyToClipboardAction title="Copy Header Cookie"  content={requestHeaderCookie} />
                <PasteAction title="Paste Header Cookie"  content={requestHeaderCookie} />                
              </ActionPanel>
            }
            />
        </List.Section>
        <List.Section title="Cookies" subtitle={cookies?.length.toString()}>
          {cookies?.map((cookie, i) => (
            <CookieListItem key={"cookie-"+i} cookie={cookie} />
          ))}
        </List.Section>
    </List>
  );
}


function DomainListItem(props: { domain: Domain }) {
  const domain = props.domain;

  return (
    <List.Item
      title={domain.name}
      icon={{source: 'https://s2.googleusercontent.com/s2/favicons?domain='+domain.name}}
      actions={
        <ActionPanel
          title={domain.name}
        >        
          <PushAction 
            icon="🍪"
            title="View Cookies" 
            target={<CookieList domain_name={domain.name}/>} />
        </ActionPanel>
      }
    />
  );
}


function CookieListItem(props: { cookie: Cookie }) {
  const cookie = props.cookie;

  return (
    <List.Item
      title={cookie.name}
      subtitle={cookie.value}
      icon="🍪"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy Cookie Value" content={cookie.value} />
            <CopyToClipboardAction title="Copy Cookie Name" content={cookie.name} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <PasteAction shortcut={{ modifiers: ["cmd"], key: "p" }} title="Paste Cookie Value" content={cookie.value} />
            <PasteAction title="Paste Cookie Name" content={cookie.name} />
          </ActionPanel.Section>               
        </ActionPanel>
      }
    />
  );
}



function useCookieSearch(domain_name: string): CookieSearch {
    const [cookies, setCookies] = useState<Cookie[]>([])
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    let cancel = false

    useEffect(() => {
        async function searchCookies() {
            if (cancel) { return }

            setError(undefined)

            try {
              

              const {err, cookies} = await chrome.getCookiesPromised('https://'+domain_name)
              
              if(err){
                setError(err as string)
              }else{
                setCookies(cookies);
              }

            } catch (e) {
              if (!cancel) {
                  setError(e as string)
              }
            } finally {
              if (!cancel)
                  setIsLoading(false)
            }
        }

        if(domain_name){
          searchCookies();
        } else {
          setIsLoading(false)
        }
        

        return () => {
            cancel = true
        }

    }, [domain_name])

    return { cookies, error, isLoading }
}

function useDomainSearch(searchText?: string | undefined): DomainSearch {
    const [domains, setDomains] = useState<Domain[]>([])
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState<boolean>(true)

    let cancel = false

    useEffect(() => {
        async function searchDomains() {
            if (cancel) { return }

            setError(undefined)

            try {
              
              const {err, domains} = await chrome.getDomainsPromised((searchText ? searchText : ''))
         
              if(err){
                setError(err as string)
              }else{
                setDomains(domains);
              }
              

            } catch (e) {
              if (!cancel) {
                setError(e as string)
              }
            } finally {
              if (!cancel)
               setIsLoading(false)
            }
        }

       

        searchDomains();
       

        return () => {
            cancel = true
        }

    }, [searchText])

    return { domains, error, isLoading }
}


interface CookieSearch {
  cookies?: Cookie[]
  error?: string
  isLoading: boolean
}


type Cookie = {
  name: string;
  value: string;
  creation_utc: number;
};

interface DomainSearch {
  domains?: Domain[]
  error?: string
  isLoading: boolean
}


type Domain = {
  name: string;
};
