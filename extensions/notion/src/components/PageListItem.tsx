import {
  ActionPanel,
  Color,
  Icon,
  List,
  ImageLike,
  showToast,
  ToastStyle,
  closeMainWindow,
  CopyToClipboardAction,
  PasteAction,
  PushAction,
  ImageMask,
  useNavigation,
  preferences,
  getApplications,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  DatabaseView,
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
  fetchDatabases,
  extractPropertyValue
} from '../utils/notion'
import {
  storeRecentlyOpenedPage,
  loadRecentlyOpenedPages
} from '../utils/local-storage'
import {  
  ActionSetVisibleProperties,
  ActionEditPageProperty,
  CreateDatabaseForm,
  DatabaseViewForm,
  DatabaseKanbanView,
  DatabaseList,
  PageDetail,
} from './'
import moment from 'moment'
import open from 'open'

export function PageListItem (props: { keywords?: string[], page: Page, databaseView?: DatabaseView, databaseProperties?: DatabaseProperty[], saveDatabaseView: any, setRefreshView: any, users?: User[], icon?: ImageLike, accessoryIcon?: ImageLike, customActions?: Element[] }): JSX.Element {
  const page = props.page
  const pageId = page.id
  const pageProperties = page.properties
  const icon = (props.icon ? props.icon : {source: ((page.icon_emoji) ? page.icon_emoji : ( page.icon_file ?  page.icon_file :  ( page.icon_external ?  page.icon_external : Icon.TextDocument)))})
  const accessoryIcon = props.accessoryIcon
  const customActions = props.customActions
  const databaseProperties = props.databaseProperties
  const databaseView = props.databaseView
  const keywords: string[] = (props.keywords ? props.keywords : [])
  var databaseViewCopy: any;
  if(databaseView && databaseView.properties){
    databaseViewCopy = JSON.parse(JSON.stringify(databaseView)) as DatabaseView
  }
  const users = props.users
  const saveDatabaseView = props.saveDatabaseView
  const setRefreshView = props.setRefreshView


  
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
  
  if(databaseView && databaseView.properties){

    const visiblePropertiesIds = Object.keys(databaseView.properties)
    if(visiblePropertiesIds[0]){
      var accessoryTitle = ''
      const accessoryTitles: string[] = []
      visiblePropertiesIds.forEach(function (propId: string) {

        const extractedProperty = extractPropertyValue(page, propId);
        if(extractedProperty){
          keywords.push(extractedProperty)
          accessoryTitles.push(extractedProperty)
        }     
      })
          
      if(accessoryTitles[0]){
        accessoryTitle = accessoryTitles.join('  |  ')
      }
    }
  }

  const quickEditProperties = databaseProperties?.filter(function(property){
    return ['checkbox','select','multi_select','people'].includes(property.type)
  })

  const visiblePropertiesIds:string[] = []
  if(databaseView && databaseView.properties){    
    databaseProperties?.forEach(function (dp: DatabaseProperty){

      if(databaseView?.properties && databaseView.properties[dp.id])
        visiblePropertiesIds.push(dp.id)
    })
  }
  

  return (<List.Item
    keywords={keywords}
    title={(page.title ? page.title : 'Untitled')}
    icon={icon}
    accessoryIcon={accessoryIcon}
    accessoryTitle={accessoryTitle}
    subtitle={(page.object === 'database' ? 'Database' : undefined)}
    actions={            
    <ActionPanel>
      <ActionPanel.Section key='main-action-section' title={(page.title ? page.title : 'Untitled')}>
      {(page.object === 'database' ? <PushAction key='navigate-to-database-action' title='Navigate to Database' icon={Icon.ArrowRight} target={<DatabaseList databasePage={page} />}/> :  <PushAction title='Preview Page' icon={Icon.TextDocument} target={<PageDetail page={page} />}/>)}
        <ActionPanel.Item
          key={`page-${pageId}-action-open-in-notion`}
          title='Open in Notion'
          icon={'notion-logo.png'}
          onAction={function () { handleOnOpenPage(page) }}/> 
      {customActions?.map((action) => (action))}
      {(databaseProperties ? 
        <ActionPanel.Submenu 
          key={`page-${pageId}-action-edit-property`}
          title='Edit Property'
          icon={'icon/edit_page_property.png'}
          shortcut={{ modifiers: ["cmd","shift"], key: "p" }}>
          {quickEditProperties?.map(function (dp: DatabaseProperty) {
            return (<ActionEditPageProperty 
              key={`page-${pageId}-action-edit-property-${dp.id}`}
              databaseProperty={dp} 
              pageId={page.id} 
              pageProperty={page.properties[dp.id]} 
              setRefreshView={setRefreshView} />)           
          })}
        </ActionPanel.Submenu>
      : null )}
      </ActionPanel.Section> 
      
      <ActionPanel.Section>
        <PushAction
          key={`page-${pageId}-create-new-page-action`}
          title='Create New Page' 
          icon={Icon.Plus} 
          shortcut={{ modifiers: ["cmd"], key: "n" }} 
          target={<CreateDatabaseForm 
            databaseId={page.parent_database_id} 
            setRefreshView={setRefreshView} />}/>
      </ActionPanel.Section>
          
      {(databaseProperties ? 
        <ActionPanel.Section title='View options'>
          <PushAction key={`page-${pageId}-set-view-type-action`} title='Set View Type...' icon={(databaseView?.type ? `./icon/view_${databaseView.type }.png` : './icon/view_list.png')} target={<DatabaseViewForm isDefaultView databaseId={page.parent_database_id!} databaseView={databaseView} saveDatabaseView={saveDatabaseView} />}/>
          <ActionSetVisibleProperties
            key={`page-${pageId}-set-visble-property-action`} 
            databaseProperties={databaseProperties} 
            selectedPropertiesIds={visiblePropertiesIds} 
            onSelect={function (propertyId: string) {
              databaseViewCopy.properties[propertyId] = {}                                          
              saveDatabaseView(databaseViewCopy)
            }} 
            onUnselect={function (propertyId: string) {
              delete databaseViewCopy.properties[propertyId]
              saveDatabaseView(databaseViewCopy)
            }} />         
        </ActionPanel.Section> 
        
        : null)}  

        <ActionPanel.Section>
        <CopyToClipboardAction
          key={`page-${pageId}-copy-page-url`}
          title='Copy Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "c" }}/>
        <PasteAction
          key={`page-${pageId}-past-page-url`}
          title='Paste Page URL'
          content={page.url}
          shortcut={{ modifiers: ["cmd","shift"], key: "v" }}/>
      </ActionPanel.Section>    
    </ActionPanel>
    }/>)
}