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
  PushAction,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  Page,
  DatabaseProperty,
  PageContent,
  searchPages,
  queryDatabase,
  fetchDatabaseProperties,
  fetchPageContent,
} from './notion'
import moment from 'moment'
import open from 'open'

interface DatabaseView {
  properties: Record<string,any>
}

export default function SearchPageList(): JSX.Element {
  // Setup useState objects
  const [pages, setPages] = useState<Page[]>()
  const [recentlyOpenPages, setRecentlyOpenPages] = useState<Page[]>()
  const [searchText, setSearchText] = useState<string>()
  const [isLoading, setIsLoading] = useState<boolean>(true)

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


  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder='Search pages'
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      <List.Section key='recently-open-pages' title='Recent'>
      {recentlyOpenPages?.map((p) => (
         <PageListItem 
          key={`recently-open-page-${p.id}`}
          page={p}
          databaseView={undefined}
          databaseProperties={undefined}
          saveDatabaseView={undefined}/>
        ))}
      </List.Section>
      <List.Section key='search-result' title='Search'>
      {pages?.map((p) => (
        <PageListItem 
          key={`search-result-page-${p.id}`}
          page={p}
          databaseView={undefined}
          databaseProperties={undefined}
          saveDatabaseView={undefined}/>
        ))}
      </List.Section>
    </List>
  ) 
}


export function DatabasePagesList(props: {databasePage: Page}): JSX.Element {

  // Get database info
  const databasePage = props.databasePage
  const databaseId = databasePage.id;
  const databaseName = (databasePage.icon_emoji ? databasePage.icon_emoji+' ': '')+(databasePage.title ? databasePage.title : 'Untitled')

  // Store as recently opned page
  storeRecentlyOpenedPage(databasePage)

  // Setup useState objects
  const [databasePages, setDatabasePages] = useState<Page[]>()  
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [actionPanelItems, setActionPanelItems] = useState<Element[]>([])
  const [databaseView, setDatabaseView] = useState<DatabaseView>()
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>()


  // Currently supported properties
  const supportedPropTypes = [
    'number',
    'rich_text',
    'url',
    'email',
    'phone_number',
    'date',
    'checkbox',
    'select',
    'multi_select',
    'formula'
  ]

  // Load database properties
  useEffect(() => {
    const getDatabaseProperties = async () => {
      

      const cachedDatabaseProperties = await loadDatabaseProperties(databaseId)
      if(cachedDatabaseProperties){
        setDatabaseProperties(cachedDatabaseProperties)
      }

      const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId)

      if(fetchedDatabaseProperties){
        const supportedDatabaseProperties = fetchedDatabaseProperties.filter(function (property: DatabaseProperty){
          return supportedPropTypes.includes(property.type)
        })
        setDatabaseProperties(supportedDatabaseProperties)
        storeDatabaseProperties(databaseId,supportedDatabaseProperties)
      }
    }
    getDatabaseProperties()
  }, [])
  
  // Load database view
  useEffect(() => {
    const getDatabseView = async () => {
      
      const loadedDatabaseView = await loadDatabaseView(databaseId)
      
      if(loadedDatabaseView && loadedDatabaseView.properties){
        setDatabaseView(loadedDatabaseView)
      } else {
        setDatabaseView({
          properties:{}
        })
      }      
    }
    getDatabseView()
  }, [])

  // Fetch last 100 edited database pages
  useEffect(() => {
    const getDatabasePages = async () => {

      setIsLoading(true)

      const cachedDatabasePages = await loadDatabasePages(databaseId)

      if (cachedDatabasePages) {        
        setDatabasePages(cachedDatabasePages)
      }

      const fetchedDatabasePages = await queryDatabase(databaseId, undefined)
      if(fetchedDatabasePages && fetchedDatabasePages[0]){
        setDatabasePages(fetchedDatabasePages) 
        setIsLoading(false)
        storeDatabasePages(databaseId, fetchedDatabasePages)         
      }   
      
    }
    getDatabasePages()
  }, [])


  // Handle save new database view
  function saveDatabaseView(newDatabaseView: DatabaseView): void {
    console.log('newDatabaseView',newDatabaseView)
    setDatabaseView(newDatabaseView)
    storeDatabaseView(databaseId,newDatabaseView)
  }
  
  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder='Filter pages'
      navigationTitle={' →  '+databaseName}
      throttle={true}
    >
      <List.Section key='database-pages-list' title='Recent'>
      {databasePages?.map((p) => (
        <PageListItem 
          key={`database-${databaseId}-page-${p.id}`}
          page={p}
          databaseView={databaseView}
          databaseProperties={databaseProperties}
          saveDatabaseView={saveDatabaseView}/>
        ))}
      </List.Section>
    </List>
  ) 
}

function PageListItem(props: { page: Page, databaseView: DatabaseView | undefined, databaseProperties: DatabaseProperty[] | undefined, saveDatabaseView: any }): JSX.Element {
  const page = props.page
  const pageProperties = page.properties

  const databaseProperties = props.databaseProperties
  const databaseView = props.databaseView
  const saveDatabaseView = props.saveDatabaseView
  
  const isDatabase = page.object === 'database'
  const parentIsDatabase = (page.parent_database_id ? true : false)
  

  async function handleOnOpenPage(page: Page) {
    const installedApplications = await getApplications();
    const isNotionInstalled = installedApplications.some(function(app) {
      return app.bundleId === 'notion.id';
    })
    open((isNotionInstalled ?  page.url.replace('https','notion') : page.url))
    await storeRecentlyOpenedPage(page)
    closeMainWindow();
  }

  // Set database view properties
  var accessoryTitle = moment(page.last_edited_time).fromNow()
  var keywords: string[] = []
  if(databaseView && databaseView.properties){

    const visiblePropertiesIds = Object.keys(databaseView.properties)
    if(visiblePropertiesIds[0]){
      var accessoryTitle = ''
      const accessoryTitles: string[] = []
      visiblePropertiesIds.forEach(function (propId: string) {

        const property = databaseView.properties[propId]

        if(pageProperties && pageProperties[propId]) {
          const property = pageProperties[propId]
          var type = property.type
          var propertyValue = property[type]
          
          if(propertyValue){

            var propAccessoryTitle = ''

            if(type === 'formula'){
              type = propertyValue.type
              propertyValue = propertyValue[type]
            }

            switch (type) {
              case 'title':            
                propAccessoryTitle = (propertyValue[0] ? propertyValue[0].plain_text : 'Untitled')
                break
              case 'number':
                propAccessoryTitle = propertyValue.toString()
                break
              case 'rich_text':
                propAccessoryTitle = (propertyValue[0] ? propertyValue[0].plain_text : null)
                break
              case 'url':
                propAccessoryTitle = (propertyValue[0] ? propertyValue[0].plain_text : null)
                break
              case 'email':
                propAccessoryTitle = (propertyValue[0] ? propertyValue[0].plain_text : null)
                break
              case 'phone_number':
                propAccessoryTitle = (propertyValue[0] ? propertyValue[0].plain_text : null)
                break
              case 'date':
                propAccessoryTitle = moment(propertyValue.start).fromNow()
                break
              case 'checkbox':
                propAccessoryTitle = (propertyValue ? '☑' : '☐')
                break
              case 'select':
                propAccessoryTitle = propertyValue.name
                break
              case 'multi_select':   
                const names:string[] = []
                propertyValue.forEach(function (selection: Record<string,any>){
                  keywords.push(selection.name as string)
                  names.push(selection.name as string)
                })
                propAccessoryTitle = names.join(', ')
                break
              case 'string':
                propAccessoryTitle = propertyValue
                break
            }

            if(propAccessoryTitle){
              keywords.push(propAccessoryTitle)
              accessoryTitles.push(propAccessoryTitle)
            }            
          }          
        }     
      })
          
      if(accessoryTitles[0]){
        accessoryTitle = accessoryTitles.join('  |  ')
      }
    }
  }

  return (<List.Item
    keywords={keywords}
    title={(page.title ? page.title : 'Untitled')}
    icon={{source: ((page.icon_emoji) ? page.icon_emoji : ( page.icon_file ?  page.icon_file :  ( page.icon_external ?  page.icon_external : Icon.TextDocument)))}}
    accessoryTitle={accessoryTitle}
    subtitle={(page.object === 'database' ? 'Database' : undefined)}
    actions={            
    <ActionPanel>
      <ActionPanel.Section title={(page.title ? page.title : 'Untitled')}>
      {(page.object === 'database' ? <PushAction title='Navigate to Database' icon={Icon.ArrowRight} target={<DatabasePagesList databasePage={page} />}/> :  <PushAction title='Preview page' icon={Icon.ArrowRight} target={<PageDetail page={page} />}/>)}
        <ActionPanel.Item
          title='Open in Notion'
          icon={'notion-logo.png'}
          onAction={function () { handleOnOpenPage(page) }}/>
      </ActionPanel.Section>      
      <ActionPanel.Section>
        <CopyToClipboardAction
          title='Copy Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "c" }}/>
        <PasteAction
          title='Paste Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "v" }}/>
      </ActionPanel.Section>
      {(databaseProperties ? 
        <ActionPanel.Section title='View options'>
          <ActionPanel.Submenu icon={Icon.Gear} title='Properties...'>
            {databaseProperties?.map((dp: DatabaseProperty) => (
              <ActionPanel.Item
                icon={((databaseView && databaseView.properties && databaseView.properties[dp.id]) ? Icon.Eye  : {source: Icon.EyeSlash, tintColor: Color.SecondaryText} )}  
                key={page.id+'-view-property-'+dp.id}
                onAction={function () {
                  if(databaseView && databaseView.properties){
                    if(databaseView.properties[dp.id]){
                      delete databaseView.properties[dp.id]
                    } else {
                      databaseView.properties[dp.id] = {}
                    }                             
                    saveDatabaseView(databaseView)
                  }                  
                }}
                title={(dp.name ? dp.name : 'Untitled')}/>
            ))}
          </ActionPanel.Submenu>
        </ActionPanel.Section> 
        : null)}         
    </ActionPanel>
    }/>)
}

function PageDetail(props: { page: Page }): JSX.Element {
  
  const page = props.page 
  const pageName = (page.icon_emoji ? page.icon_emoji+' ': '')+(page.title ? page.title : 'Untitled')

  storeRecentlyOpenedPage(page)

  const [pageContent, setPageContent] = useState<PageContent>()
  const [isLoading, setIsLoading] = useState<boolean>(false)


  // Load page content
  useEffect(() => {
    const getPageContent = async () => {
      
      setIsLoading(true)

      const fetchedPageContent =  await fetchPageContent(page.id)

      if(fetchedPageContent && fetchedPageContent.markdown){
        setPageContent(fetchedPageContent)
      }  

      setIsLoading(false)
    }
    getPageContent()
  }, [])

  async function handleOnOpenPage(page: Page) {
    const installedApplications = await getApplications();
    const isNotionInstalled = installedApplications.some(function(app) {
      return app.bundleId === 'notion.id';
    })
    open((isNotionInstalled ?  page.url.replace('https','notion') : page.url))
    await storeRecentlyOpenedPage(page)
    closeMainWindow();
  }

  return (<Detail 
    markdown={`# ${page.title}\n`+ (pageContent ? pageContent.markdown : '*Loading...*')}
    isLoading={isLoading}
    navigationTitle={' →  '+pageName} 
    actions={            
    <ActionPanel>
      <ActionPanel.Section title={(page.title ? page.title : 'Untitled')}>
        <ActionPanel.Item
          title='Open in Notion'
          icon={'notion-logo.png'}
          onAction={function () { handleOnOpenPage(page) }}/>
      </ActionPanel.Section>      
      <ActionPanel.Section>
        <CopyToClipboardAction
          title='Copy Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "c" }}/>
        <PasteAction
          title='Paste Page URL'
          content={page.url}
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

async function storeDatabasePages(databaseId: string, pages: Page[]) {
  const data = JSON.stringify(pages)
  await setLocalStorageItem('PAGES_DATABASE_'+databaseId, data)
}

async function loadDatabasePages(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem('PAGES_DATABASE_'+databaseId)
  return data !== undefined ? JSON.parse(data) : undefined
}

async function storeDatabaseProperties(databaseId: string, databaseProperties: DatabaseProperty[]) {
  const data = JSON.stringify(databaseProperties)
  await setLocalStorageItem('PROPERTIES_DATABASE_'+databaseId, data)
}

async function loadDatabaseProperties(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem('PROPERTIES_DATABASE_'+databaseId)
  return data !== undefined ? JSON.parse(data) : undefined
}

async function storeDatabaseView(databaseId: string, databaseView: DatabaseView) {
  const data = JSON.stringify(databaseView)
  await setLocalStorageItem('VIEW_DATABASE_'+databaseId, data)
}

async function loadDatabaseView(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem('VIEW_DATABASE_'+databaseId)
  return data !== undefined ? JSON.parse(data) : undefined
}
