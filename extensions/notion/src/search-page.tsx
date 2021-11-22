import {
  ActionPanel,
  Color,
  Icon,
  List,
  Detail,
  FormValues,
  preferences,
  showToast,
  ToastStyle,
  setLocalStorageItem,
  getLocalStorageItem,
  getApplications,
  closeMainWindow,
  CopyToClipboardAction,
  PasteAction,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  Page,
  searchPages,
} from './notion'
import moment from 'moment'
import open from 'open'



export default function SearchPageList(): JSX.Element {
  
  // Setup useState objects
  const [pages, setPages] = useState<Page[]>()
  const [recentlyOpenPages, setRecentlyOpenPages] = useState<Page[]>()
  const [searchText, setSearchText] = useState<string>()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isNotionInstalled, setIsNotionInstalled] = useState<boolean>()

  
  // Check Notion is installed
  useEffect(() => {
    const checkAppInstalled = async () => {
      if(isNotionInstalled === undefined) {
        const installedApplications = await getApplications();
        setIsNotionInstalled(installedApplications.some(function(app) {
          return app.bundleId === 'notion.id';
        })) 
      }     
    }
    checkAppInstalled()
  }, [])


  // Fetch and filter recently open pages
  useEffect(() => {
    const loadRecentlyOpenPage = async () => {

      const cachedRecentlyOpenPages = await loadRecentlyOpenedPages()

      if (cachedRecentlyOpenPages) {
        if(searchText){
          setRecentlyOpenPages(cachedRecentlyOpenPages.filter(function (p: Page){
            return (p.title ? p.title : 'Untitled').toLowerCase().includes(searchText.toLowerCase())
          }))
        } else {
          setRecentlyOpenPages(cachedRecentlyOpenPages)
        }        
      }     
    }
    loadRecentlyOpenPage()
  }, [searchText])


  // Search pages
  useEffect(() => {
    const searchNotionPages = async () => {

      setIsLoading(true)

      if(searchText){   
        const searchedPages = await searchPages(searchText) 

        if(searchedPages && searchedPages[0]){
          setPages(searchedPages)          
        }        
      } else {
        setPages([])
      }
      setIsLoading(false)     
    }
    searchNotionPages()
  }, [searchText])


  async function handleOnOpenPage(page: Page) {
    open((isNotionInstalled ?  page.url.replace('https','notion') : page.url))
    await storeRecentlyOpenedPage(page)
    closeMainWindow();

  }


  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder='Search pages'
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      <List.Section key='recently-open-pages' title='Recently Opened'>
      {recentlyOpenPages?.map((p) => (
         <PageListItem 
          key={`page-${p.id}`}
          p={p}
          isNotionInstalled={isNotionInstalled}
          handleOnOpenPage={handleOnOpenPage}/>
        ))}
      </List.Section>
      <List.Section key='search-result' title='Search Results'>
      {pages?.map((p) => (
        <PageListItem 
          key={`page-${p.id}`}
          p={p}
          isNotionInstalled={isNotionInstalled}
          handleOnOpenPage={handleOnOpenPage}
          />
        ))}
      </List.Section>
    </List>
  ) 
}

function PageListItem(props: { p: Page, isNotionInstalled: boolean | undefined, handleOnOpenPage: Function}): JSX.Element {
  const p = props.p;
  const isNotionInstalled = props.isNotionInstalled;
  const handleOnOpenPage = props.handleOnOpenPage;

  return (<List.Item
    key={p.id}
    title={(p.title ? p.title : 'Untitled')}
    icon={{source: ((p.icon_emoji) ? p.icon_emoji : ( p.icon_file ?  p.icon_file :  ( p.icon_external ?  p.icon_external : Icon.TextDocument)))}}
    accessoryTitle={moment(p.last_edited_time).fromNow()}
    subtitle={(p.object === 'database' ? 'Database' : undefined)}
    actions={            
    <ActionPanel>
      <ActionPanel.Section title={(p.title ? p.title : 'Untitled')}>
        <ActionPanel.Item
          title='Open Page'
          icon={{source:(isNotionInstalled ? 'notion-logo.png' : Icon.Globe)}}
          onAction={function () { handleOnOpenPage(p)}}/>
      </ActionPanel.Section>
      <ActionPanel.Section>
        <CopyToClipboardAction
          title='Copy Page URL'
          content={p.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "c" }}/>
        <PasteAction
          title='Paste Page URL'
          content={p.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "v" }}/>
      </ActionPanel.Section>
    </ActionPanel>
    }/>)
}

async function storeRecentlyOpenedPage(page: Page) {
  const cachedRecentlyOpenPages = await loadRecentlyOpenedPages()
  const updatedRecentlyOpenPages = (cachedRecentlyOpenPages ? cachedRecentlyOpenPages : [])

  const cachedPageIndex = updatedRecentlyOpenPages.findIndex(function (cp: Page) { return cp.id === page.id });

  if(cachedPageIndex > -1){
    updatedRecentlyOpenPages[cachedPageIndex].last_edited_time = Date.now();
  } else {
    page.last_edited_time = Date.now();
    updatedRecentlyOpenPages.push(page)
  }
  
  updatedRecentlyOpenPages.sort(function (a: Page, b: Page) {
    if ( a.last_edited_time > b.last_edited_time ){
      return -1;
    }
    if ( a.last_edited_time < b.last_edited_time ){
      return 1;
    }
    return 0;
  })

  const data = JSON.stringify(updatedRecentlyOpenPages.slice(0,20))
  await setLocalStorageItem('RECENTLY_OPENED_PAGES', data)
}

async function loadRecentlyOpenedPages() {
  const data: string | undefined = await getLocalStorageItem('RECENTLY_OPENED_PAGES')
  return data !== undefined ? JSON.parse(data) : undefined
}
