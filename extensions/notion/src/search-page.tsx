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
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  Database,
  DatabasePropertie,
  Page,
  fetchDatabases,
  fetchDatabaseProperties,
  createDatabasePage,
  searchPages,
} from './notion'
import moment from 'moment'
import open from 'open'



export default function SearchPageList(): JSX.Element {
  // Get preference values
  const notion_token = String(preferences.notion_token.value)
  const notion_workspace_slug = String(preferences.notion_workspace_slug.value)
  if (notion_token.length !== 50) {
    showToast(ToastStyle.Failure, 'Invalid token detected')
    throw new Error('Invalid token length detected')
  }
  const pageBaseURL = 'notion.so/'+notion_workspace_slug+'/'

  // Setup useState objects
  const [pages, setPages] = useState<Page[]>()
  const [recentlyOpenPages, setRecentlyOpenPages] = useState<Page[]>()
  const [searchText, setSearchText] = useState<string>()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isNotionInstalled, setIsNotionInstalled] = useState<boolean>()

  
  // Fetch pages
  useEffect(() => {
    const fetchData = async () => {

      if(isNotionInstalled === undefined) {
        const installedApplications = await getApplications();
        setIsNotionInstalled(installedApplications.some(function(app) {
          return app.bundleId === 'notion.id';
        })) 
      }

      setIsLoading(true)

      const cachedLastEditedPages = await loadLastEditedPages()

      if (cachedLastEditedPages) {
        if(searchText){
          setPages(cachedLastEditedPages.filter(function (p: Page){
            return (p.title ? p.title : 'Untitled').toLowerCase().includes(searchText.toLowerCase())
          }))
        } else {
          setPages(cachedLastEditedPages)
        }        
      }
      
     if(searchText){
        const searchedPages = await searchPages(searchText)      
        setPages(searchedPages)
      } else {
        const fetchedLastEditedPages = await searchPages(undefined)      
        setPages(fetchedLastEditedPages)
        storeLastEditedPages(fetchedLastEditedPages)
      }

      setIsLoading(false)
     
    }
    fetchData()
  }, [searchText])


  // Fetch recently open pages
  useEffect(() => {
    const fetchData = async () => {

      const cachedRecentlyOpenPages = await loadRecentlyOpenPages()

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
    fetchData()
  }, [searchText, recentlyOpenPages])


  async function handleOnOpenPage(page: Page) {
    const pageUrl = pageBaseURL+page.id.replace(/-/g,'')
    closeMainWindow();
    open((isNotionInstalled ?  'notion://' : 'https://')+pageUrl);
    await storeRecentlyOpenPage(page)

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
        <List.Item
          key={p.id}
          title={(p.title ? p.title : 'Untitled')}
          icon={{source: ((p.icon_emoji) ? p.icon_emoji : ( p.icon_file ?  p.icon_file :  ( p.icon_external ?  p.icon_external : Icon.TextDocument)))}}
          accessoryTitle={moment(p.last_edited_time).fromNow()}
          subtitle={(p.object === 'database' ? 'Database' : undefined)}
          actions={            
          <ActionPanel>
            <ActionPanel.Section title={(p.title ? p.title : 'Untitled')}>
              <ActionPanel.Item 
                id={p.id}
                key={p.id}
                title='Open Page'
                icon={{source:(isNotionInstalled ? 'notion-logo.png' : Icon.Globe)}}
                onAction={function () { handleOnOpenPage(p)}}
                 />
              </ActionPanel.Section>
          </ActionPanel>
          }/>
        ))}
      </List.Section>
      <List.Section key='search-result' title={( searchText ? 'Search Results' : 'Last Edited')}>
      {pages?.map((p) => (
        <List.Item
          key={p.id}
          title={(p.title ? p.title : 'Untitled')}
          icon={{source: ((p.icon_emoji) ? p.icon_emoji : ( p.icon_file ?  p.icon_file :  ( p.icon_external ?  p.icon_external : Icon.TextDocument)))}}
          accessoryTitle={moment(p.last_edited_time).fromNow()}
          subtitle={(p.object === 'database' ? 'Database' : undefined)}
          actions={            
          <ActionPanel>
            <ActionPanel.Section title={(p.title ? p.title : 'Untitled')}>
              <ActionPanel.Item 
                id={p.id}
                key={p.id}
                title='Open Page'
                icon={{source:(isNotionInstalled ? 'notion-logo.png' : Icon.Globe)}}
                onAction={function () { handleOnOpenPage(p)}}
                 />
              </ActionPanel.Section>
          </ActionPanel>
          }/>
        ))}
      </List.Section>
    </List>
  ) 
}

export function NoSharedContent(): JSX.Element{
  return (<Detail markdown={`## No Shared Content 
  \n\n Make sure to **Invite** at least one database with the integration you have created.\n ![NotionShare](https://images.ctfassets.net/lzny33ho1g45/2pIkZOvLY2o2dwfnJIYJxt/d5d9f1318b2e79ad92d8197e4abab655/automate-notion-with-zapier-11-share-options.png)`} />)
}

function validateForm(values: FormValues): boolean {
  const valueKeys = Object.keys(values) as string[]
  const titleKey = valueKeys.filter(function (vk){ return vk.includes('property::title')})[0]
  if (!values[titleKey]) {
    showToast(ToastStyle.Failure, 'Please set title value');
    return false;
  }
  return true;
}


function notionColorToTintColor (notionColor: string): Color {
   const colorMapper = {
    'default': Color.PrimaryText,
    'gray': Color.PrimaryText,
    'brown': Color.Brown,
    'red': Color.Red,
    'blue': Color.Blue,
    'green': Color.Green,
    'yellow': Color.Yellow,
    'orange': Color.Orange,
    'purple': Color.Purple,
    'pink': Color.Magenta
  } as Record<string,Color>

  return colorMapper[notionColor] 
}

async function storeLastEditedPages(pages: Page[]) {
  const data = JSON.stringify(pages)
  await setLocalStorageItem('LAST_EDITED_PAGES', data)
}

async function loadLastEditedPages() {
  const data: string | undefined = await getLocalStorageItem('LAST_EDITED_PAGES')
  return data !== undefined ? JSON.parse(data) : undefined
}

async function storeRecentlyOpenPage(page: Page) {
  var recentlyOpenPages = await loadRecentlyOpenPages()
  if(!recentlyOpenPages){
    recentlyOpenPages = [];
  }

  const pageExistInList = recentlyOpenPages.filter(function (recentPage: Page) {
    return recentPage.id === page.id
  })

  if(pageExistInList && pageExistInList[0]){
    pageExistInList[0].last_edited_time = Date.now();
  } else {
    page.last_edited_time = Date.now();
    recentlyOpenPages.push(page)
  }
  
  recentlyOpenPages.sort(function (a: Page, b: Page) {
    if ( a.last_edited_time > b.last_edited_time ){
      return -1;
    }
    if ( a.last_edited_time < b.last_edited_time ){
      return 1;
    }
    return 0;
  })

  const data = JSON.stringify(recentlyOpenPages.slice(0,5))
  await setLocalStorageItem('RECENTLY_OPEN_PAGES', data)
}

async function loadRecentlyOpenPages() {
  const data: string | undefined = await getLocalStorageItem('RECENTLY_OPEN_PAGES')
  return data !== undefined ? JSON.parse(data) : undefined
}

