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
  ImageMask,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  Page,
  DatabaseProperty,
  DatabasePropertyOption,
  PageContent,
  User,
  searchPages,
  queryDatabase,
  fetchDatabaseProperties,
  fetchPageContent,
  notionColorToTintColor,
  patchPage,
  fetchUsers,
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
          saveDatabaseView={undefined}
          setRefreshView={undefined}/>
        ))}
      </List.Section>
      <List.Section key='search-result' title='Search'>
      {pages?.map((p) => (
        <PageListItem 
          key={`search-result-page-${p.id}`}
          page={p}
          databaseView={undefined}
          databaseProperties={undefined}
          saveDatabaseView={undefined}
          setRefreshView={undefined}/>
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
  const [databaseView, setDatabaseView] = useState<DatabaseView>()
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>()
  const [refreshView, setRefreshView] = useState<number>()  


  const [users, setUsers] = useState<User[]>()  
  const [relationsPages, setRelationsPages] = useState<Record<string,Page[]>>({})

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
    'formula',
    'people',
    'relation'
  ]

  // Load database properties
  useEffect(() => {
    const getDatabaseProperties = async () => {
      

      const cachedDatabaseProperties = await loadDatabaseProperties(databaseId)
      if(cachedDatabaseProperties){
        setDatabaseProperties(cachedDatabaseProperties)
        
        // Load users
        hasPeopleProperty = cachedDatabaseProperties.some(function(cdp) {
          return cdp.type === 'people';
        })
        if(hasPeopleProperty){
          const cachedUsers = await loadUsers()
          if(cachedUsers){
            setUsers(cachedUsers)
          }            
        }
      }

      const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId)

      if(fetchedDatabaseProperties){
        const supportedDatabaseProperties = fetchedDatabaseProperties.filter(function (property: DatabaseProperty){
          return supportedPropTypes.includes(property.type)
        })
        setDatabaseProperties(supportedDatabaseProperties)

        // Fetch relation pages
        supportedDatabaseProperties.forEach(async function (cdp){
          if(cdp.type === 'relation' && cdp.relation_id){
            const fetchedRelationPages = await queryDatabase(cdp.relation_id, undefined)
            if(fetchedRelationPages && fetchedRelationPages[0]){
              var copyRelationsPages = JSON.parse(JSON.stringify(relationsPages))
              copyRelationsPages[cdp.relation_id] = fetchedRelationPages
              setRelationsPages(copyRelationsPages)
              storeDatabasePages(cdp.relation_id, fetchedRelationPages)         
            }
          }
        })

        // Fetch users
        hasPeopleProperty = supportedDatabaseProperties.some(function(sdp) {
          return sdp.type === 'people';
        })
        if(hasPeopleProperty){
          const fetchedUsers = await fetchUsers()
          if(fetchedUsers){
            setUsers(fetchedUsers)
            storeUsers(fetchedUsers)
          }
        }

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
  }, [refreshView])


  // Handle save new database view
  function saveDatabaseView(newDatabaseView: DatabaseView): void {
    setDatabaseView(newDatabaseView)
    showToast(ToastStyle.Success, 'View Updated')  
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
          saveDatabaseView={saveDatabaseView}
          setRefreshView={setRefreshView}
          users={users}
          relationsPages={relationsPages}/>
        ))}
      </List.Section>
    </List>
  ) 
}

function PageListItem(props: { page: Page, databaseView: DatabaseView | undefined, databaseProperties: DatabaseProperty[] | undefined, saveDatabaseView: any, setRefreshView: any, users: User[], relationsPages: Record<string,Page[]>}): JSX.Element {
  const page = props.page
  const pageProperties = page.properties

  const databaseProperties = props.databaseProperties
  const databaseView = props.databaseView
  var databaseViewCopy: any;
  if(databaseView && databaseView.properties){
    databaseViewCopy = JSON.parse(JSON.stringify(databaseView)) as DatabaseView
  }
  const saveDatabaseView = props.saveDatabaseView
  const setRefreshView = props.setRefreshView

  const users = props.users
  const relationsPages = props.relationsPages
  
  const isDatabase = page.object === 'database'
  const parentIsDatabase = (page.parent_database_id ? true : false)
  

  async function handleOnOpenPage(page: Page) {
    const openIn = preferences.open_in?.value;
    var isNotionInstalled;
    if(!openIn || openIn === 'app'){
      const installedApplications = await getApplications();
      isNotionInstalled = installedApplications.some(function(app) {
        return app.bundleId === 'notion.id';
      })
    }
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
          
          if(propertyValue !== undefined){

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
                propAccessoryTitle = propertyValue?.toString()
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
                propAccessoryTitle = moment(propertyValue?.start).fromNow()
                break
              case 'checkbox':
                propAccessoryTitle = (propertyValue ? '☑' : '☐')
                break
              case 'select':
                propAccessoryTitle = propertyValue?.name
                break
              case 'multi_select':   
                const names:string[] = []
                propertyValue.forEach(function (selection: Record<string,any>){
                  keywords.push(selection.name as string)
                  names.push(selection.name as string)
                })
                propAccessoryTitle = names.join(', ')
                break
              case 'people':   
                const user_names:string[] = []
                propertyValue.forEach(function (user: User){
                  keywords.push(user.name as string)
                  user_names.push(user.name as string)
                })
                propAccessoryTitle = user_names.join(', ')
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

  const quickEditProperties = databaseProperties?.filter(function(property){
    return ['checkbox','select','multi_select','people','relation'].includes(property.type)
  })

  return (<List.Item
    keywords={keywords}
    title={(page.title ? page.title : 'Untitled')}
    icon={{source: ((page.icon_emoji) ? page.icon_emoji : ( page.icon_file ?  page.icon_file :  ( page.icon_external ?  page.icon_external : Icon.TextDocument)))}}
    accessoryTitle={accessoryTitle}
    subtitle={(page.object === 'database' ? 'Database' : undefined)}
    actions={            
    <ActionPanel>
      <ActionPanel.Section title={(page.title ? page.title : 'Untitled')}>
      {(page.object === 'database' ? <PushAction title='Navigate to Database' icon={Icon.ArrowRight} target={<DatabasePagesList databasePage={page} />}/> :  <PushAction title='Preview Page' icon={Icon.ArrowRight} target={<PageDetail page={page} />}/>)}
        <ActionPanel.Item
          title='Open in Notion'
          icon={'notion-logo.png'}
          onAction={function () { handleOnOpenPage(page) }}/>         
         </ActionPanel.Section>      
      <ActionPanel.Section>
      {(databaseProperties ? 
        <ActionPanel.Submenu 
          title='Edit Property'
          icon={'icon/edit_page_property.png'}
          shortcut={{ modifiers: ["cmd","shift"], key: "p" }}>
          {quickEditProperties?.map(function (dp: DatabaseProperty) {

            var patchedProperty: Record<string,any> = {}
            patchedProperty[dp.id] = {}

            switch (dp.type) {    
              case 'checkbox':
                return (<ActionPanel.Item 
                  icon={'icon/'+dp.type+'_'+pageProperties[dp.id]?.checkbox+'.png'} 
                  title={dp.name} 
                  onAction={async function () {                    
                    patchedProperty[dp.id][dp.type] = !pageProperties[dp.id]?.checkbox   
                    showToast(ToastStyle.Animated, 'Updating Property')
                    const updatedPage = await  patchPage(page.id,patchedProperty)
                    if(updatedPage && updatedPage.id){
                      showToast(ToastStyle.Success, 'Property Updated')  
                      setRefreshView(Date.now())
                    }                        
                  }}/>)
                break
              case 'select': 
                return (                  
                  <ActionPanel.Submenu 
                    title={dp.name}
                    icon={'icon/'+dp.type+'.png'}>
                    {dp?.options?.map(function (opt) {
                      return (<ActionPanel.Item 
                        icon={(opt.id !== '_select_null_' ? {source: (pageProperties[dp.id][dp.type]?.id === opt.id ? Icon.Checkmark : Icon.Circle), tintColor: notionColorToTintColor(opt.color)} : undefined )} 
                        title={opt.name}
                        onAction={async function () {
                          if(opt.id !== '_select_null_'){
                            patchedProperty[dp.id][dp.type] = { id : opt.id }
                          } else {
                            patchedProperty[dp.id][dp.type] = null
                          }
                          showToast(ToastStyle.Animated, 'Updating Property')
                          const updatedPage = await  patchPage(page.id,patchedProperty)
                          if(updatedPage && updatedPage.id){
                            showToast(ToastStyle.Success, 'Property Updated')  
                            setRefreshView(Date.now())
                          }                        
                        }}/>)
                    })}
                 </ActionPanel.Submenu>
                )
                break
              case 'multi_select':   
                const ids:string[] = []
                pageProperties[dp.id][dp.type]?.forEach(function (selection: Record<string,any>){
                  ids.push(selection.id as string)
                })
                return (
                  <ActionPanel.Submenu 
                    title={dp.name}
                    icon={'icon/'+dp.type+'.png'}>
                    {dp?.options?.map(function (opt: DatabasePropertyOption) {
                      return (<ActionPanel.Item 
                        icon={{source: (ids.includes(opt.id) ? Icon.Checkmark : Icon.Circle), tintColor: notionColorToTintColor(opt.color)}} 
                        title={opt.name}
                        onAction={async function () {
                          patchedProperty[dp.id][dp.type] = (pageProperties[dp.id][dp.type] ? pageProperties[dp.id][dp.type] : [])
                          if(ids.includes(opt.id)){
                            patchedProperty[dp.id][dp.type] = patchedProperty[dp.id][dp.type].filter(function (o: DatabasePropertyOption){
                              return o.id !== opt.id
                            })
                          } else {
                            patchedProperty[dp.id][dp.type].push({id: opt.id})
                          }
                          showToast(ToastStyle.Animated, 'Updating Property')
                          const updatedPage = await  patchPage(page.id,patchedProperty)
                          if(updatedPage && updatedPage.id){
                            showToast(ToastStyle.Success, 'Property Updated')  
                            setRefreshView(Date.now())
                          }                        
                        }}/>)
                    })}
                 </ActionPanel.Submenu>
                )
                break
              case 'people':   
                const user_ids:string[] = []
                pageProperties[dp.id][dp.type]?.forEach(function (user: Record<string,any>){
                  user_ids.push(user.id as string)
                })
                return (
                  <ActionPanel.Submenu 
                    title={dp.name}
                    icon={'icon/'+dp.type+'.png'}>
                    <ActionPanel.Section>
                      {pageProperties[dp.id][dp.type]?.map(function (user: User) {
                        return (<ActionPanel.Item 
                          icon={{source:user.avatar_url, mask: ImageMask.Circle}} 
                          title={user.name+'  ✓'}
                          onAction={async function () {
                            patchedProperty[dp.id][dp.type] = (pageProperties[dp.id][dp.type] ? pageProperties[dp.id][dp.type] : [])
                            if(user_ids.includes(user.id)){
                              patchedProperty[dp.id][dp.type] = patchedProperty[dp.id][dp.type].filter(function (o: DatabasePropertyOption){
                                return o.id !== user.id
                              })
                            }
                            showToast(ToastStyle.Animated, 'Updating Property')
                            const updatedPage = await  patchPage(page.id,patchedProperty)
                            if(updatedPage && updatedPage.id){
                              showToast(ToastStyle.Success, 'Property Updated')  
                              setRefreshView(Date.now())
                            }                      
                          }}/>)
                      })}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                    {users?.map(function (user: User) {
                      if(!user_ids.includes(user.id)){
                        return (<ActionPanel.Item 
                        icon={{source:user.avatar_url, mask: ImageMask.Circle}} 
                        title={user.name}
                        onAction={async function () {
                          patchedProperty[dp.id][dp.type] = (pageProperties[dp.id][dp.type] ? pageProperties[dp.id][dp.type] : [])
                          patchedProperty[dp.id][dp.type].push({id: user.id})
                          showToast(ToastStyle.Animated, 'Updating Property')
                          const updatedPage = await  patchPage(page.id,patchedProperty)
                          if(updatedPage && updatedPage.id){
                            showToast(ToastStyle.Success, 'Property Updated')  
                            setRefreshView(Date.now())
                          }                      
                        }}/>)
                      }                      
                    })}
                  </ActionPanel.Section>
                 </ActionPanel.Submenu>
                )
                break
              case 'relation':   
                const relation_id = dp.relation_id
                console.log(relationsPages[relation_id])
                const relation_ids:string[] = []
                pageProperties[dp.id][dp.type]?.forEach(function (relationPage: Record<string,any>){
                  relation_ids.push(relationPage.id as string)
                })
                return (
                  <ActionPanel.Submenu 
                    title={dp.name}
                    icon={'icon/'+dp.type+'.png'}>
                    <ActionPanel.Section>
                      {relationsPages[relation_id]?.map(function (rp: Page) {
                        if(relation_ids.includes(rp.id)){
                          return (<ActionPanel.Item 
                          icon={{source: ((rp.icon_emoji) ? rp.icon_emoji : ( rp.icon_file ?  rp.icon_file :  ( rp.icon_external ?  rp.icon_external : Icon.TextDocument)))}} 
                          title={rp.title+'  ✓'}
                          onAction={async function () {
                            patchedProperty[dp.id][dp.type] = (pageProperties[dp.id][dp.type] ? pageProperties[dp.id][dp.type] : [])
                            patchedProperty[dp.id][dp.type] = patchedProperty[dp.id][dp.type].filter(function (o: DatabasePropertyOption){
                              return o.id !== rp.id
                            })
                            showToast(ToastStyle.Animated, 'Updating Property')
                            const updatedPage = await  patchPage(page.id,patchedProperty)
                            if(updatedPage && updatedPage.id){
                              showToast(ToastStyle.Success, 'Property Updated')  
                              setRefreshView(Date.now())
                            }                         
                          }}/>)
                        }                      
                      })}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                    {relationsPages[relation_id]?.map(function (rp: Page) {
                      if(!relation_ids.includes(rp.id)){
                        return (<ActionPanel.Item 
                        icon={{source: ((rp.icon_emoji) ? rp.icon_emoji : ( rp.icon_file ?  rp.icon_file :  ( rp.icon_external ?  rp.icon_external : Icon.TextDocument)))}} 
                        title={rp.title}
                        onAction={async function () {
                          patchedProperty[dp.id][dp.type] = (pageProperties[dp.id][dp.type] ? pageProperties[dp.id][dp.type] : [])
                          patchedProperty[dp.id][dp.type].push({id: rp.id})
                          showToast(ToastStyle.Animated, 'Updating Property')
                          const updatedPage = await  patchPage(page.id,patchedProperty)
                          if(updatedPage && updatedPage.id){
                            showToast(ToastStyle.Success, 'Property Updated')  
                            setRefreshView(Date.now())
                          }                  
                        }}/>)
                      }                      
                    })}
                  </ActionPanel.Section>
                 </ActionPanel.Submenu>
                )
                break
            }              
          })}
        </ActionPanel.Submenu>
      : null )}
      </ActionPanel.Section>      
      <ActionPanel.Section>
        <CopyToClipboardAction
          key='copy-page-url'
          title='Copy Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "c" }}/>
        <PasteAction
          key='paste-page-url'
          title='Paste Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "v" }}/>
      </ActionPanel.Section>
      {(databaseProperties ? 
        <ActionPanel.Section title='View options'>
          <ActionPanel.Submenu icon={Icon.Gear} title='Properties...'>
            {databaseProperties?.map((dp: DatabaseProperty) => (
              <ActionPanel.Item
                icon={((databaseView && databaseView.properties && databaseView.properties[dp.id]) ? './icon/shown.png'  : {source: './icon/hidden.png', tintColor: Color.SecondaryText} )}  
                key={page.id+'-view-property-'+dp.id}
                onAction={function () {
                  if(databaseViewCopy && databaseViewCopy.properties){
                    if(databaseViewCopy.properties[dp.id]){
                      delete databaseViewCopy.properties[dp.id]
                    } else {
                      databaseViewCopy.properties[dp.id] = {}
                    }                             
                    saveDatabaseView(databaseViewCopy)
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
    const openIn = preferences.open_in?.value;
    var isNotionInstalled;
    if(!openIn || openIn === 'app'){
      const installedApplications = await getApplications();
      isNotionInstalled = installedApplications.some(function(app) {
        return app.bundleId === 'notion.id';
      })
    }    
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

async function storeUsers(users: User[]) {
  const data = JSON.stringify(users)
  await setLocalStorageItem('USERS', data)
}

async function loadUsers() {
  const data: string | undefined = await getLocalStorageItem('USERS')
  return data !== undefined ? JSON.parse(data) : undefined
}
