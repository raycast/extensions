import {
  ActionPanel,
  Color,
  Icon,
  List,
  Detail,
  FormValues,
  ImageLike,
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
  useNavigation,
  Form,
  SubmitFormAction,
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
  fetchDatabases
} from '../utils/notion'
import {
  storeRecentlyOpenedPage,
  loadRecentlyOpenedPages,
  storeDatabaseView,
  loadDatabaseView,
  storeDatabases,
  loadDatabases,
  storeDatabaseProperties,
  loadDatabaseProperties,
  storeDatabasePages,
  loadDatabasePages,
  storeUsers,
  loadUsers,
} from '../utils/local-storage'
import {
  ActionSetVisibleProperties,
  CreateDatabaseForm,
  DatabaseViewForm,
  DatabaseKanbanView,
  PageListItem,
} from './'
import moment from 'moment'
import open from 'open'






export function DatabaseListView (props: {databaseId: string, databasePages: Page[], databaseProperties: DatabaseProperty[], databaseView?: DatabaseView, setRefreshView: any, saveDatabaseView: any  }): JSX.Element {

  // Get database page list info
  const databaseId = props.databaseId
  const databasePages = props.databasePages
  const databaseProperties = props.databaseProperties
  const databaseView = props.databaseView
  const setRefreshView = props.setRefreshView
  const saveDatabaseView = props.saveDatabaseView

  return (<List.Section key='database-view-list' title='Recent'>
    {databasePages?.map(function (p) {
      return (
      <PageListItem 
        key={`database-${databaseId}-page-${p.id}`}
        page={p}
        databaseView={databaseView}
        databaseProperties={databaseProperties}
        saveDatabaseView={saveDatabaseView}
        setRefreshView={setRefreshView}/>
      )})}
    </List.Section>
  ) 
}
