import {
  render,
  ActionPanel,
  SubmitFormAction,
  PushAction,
  Color,
  Icon,
  List,
  Detail,
  Form,
  FormValues,
  OpenInBrowserAction,
  preferences,
  showToast,
  ToastStyle,
  useNavigation,
  setLocalStorageItem,
  getLocalStorageItem,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  Database,
  DatabaseProperty,
  Page,
  fetchDatabases,
  fetchDatabaseProperties,
  queryDatabase,
  createDatabasePage,
  fetchExtensionReadMe,
  notionColorToTintColor,
  fetchUsers,
} from './notion'


export default function CreateDatabaseForm(): JSX.Element {

  // On form submit function
  const { pop } = useNavigation();
  async function handleSubmit(values: FormValues) {
    if (!validateForm(values)) {
      return;
    }

    setIsLoading(true)
    const page = await createDatabasePage(values)
    setIsLoading(false)
    if(!page){
      showToast(ToastStyle.Failure, 'Couldn\'t create database page');
    }else{
      showToast(ToastStyle.Success, 'Page created!');
      pop();
    }
  }

  // Setup useState objects
  const [databases, setDatabases] = useState<Database[]>()
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>()  
  const [databaseId, setDatabaseId] = useState<string>()
  const [markdown, setMarkdown] = useState<string>()
  const [relationsPages, setRelationsPages] = useState<Record<string,Page[]>>({})
  const [users, setUsers] = useState<User[]>()
  const [isLoading, setIsLoading] = useState<boolean>(true)


  // Currently supported properties
  const supportedPropTypes = [
    'title',
    'rich_text',
    'number',
    'url',
    'email',
    'phone_number',
    'date',
    'checkbox',
    'select',
    'multi_select',
    'relation',
    'people'
  ]
  
  // Fetch databases
  useEffect(() => {
    const fetchData = async () => {

      const cachedDatabases = await loadDatabases()

      if (cachedDatabases) {
        setDatabases(cachedDatabases)
      }

      const fetchedDatabases = await fetchDatabases()
      
      
      setDatabases(fetchedDatabases)
      setIsLoading(false)

      await storeDatabases(fetchedDatabases)
     
    }
    fetchData()
  }, [])

  // Fetch selected database property
  useEffect(() => {
    const fetchData = async () => {
      if(databaseId){        

        setIsLoading(true)

        const cachedDatabaseProperties = await loadDatabaseProperties(databaseId)

        if (cachedDatabaseProperties) {
          setDatabaseProperties(cachedDatabaseProperties)

          // Load realtion page
          cachedDatabaseProperties.forEach(async function (cdp){
            if(cdp.type === 'relation' && cdp.relation_id && !relationsPages[cdp.relation_id]){
              const cachedRelationPages = await loadDatabasePages(databaseId)
              if(cachedRelationPages){
                var copyRelationsPages = JSON.parse(JSON.stringify(relationsPages))
                copyRelationsPages[cdp.relation_id] = cachedRelationPages
                setRelationsPages(copyRelationsPages)
              }
            }
          })

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
          const supportedDatabaseProperties = fetchedDatabaseProperties.filter(function (property){
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
          hasPeopleProperty = cachedDatabaseProperties.some(function(cdp) {
            return cdp.type === 'people';
          })
          if(hasPeopleProperty){
            const fetchedUsers = await fetchUsers()
            if(fetchedUsers){
              setUsers(fetchedUsers)
              await storeUsers(fetchedUsers)
            }
          }

          await storeDatabaseProperties(databaseId, supportedDatabaseProperties)
        }
        
        setIsLoading(false)
      }      
    }
    fetchData()
  }, [databaseId])

  
  // Fetch Notion Extension README
  useEffect(() => {
    const fetchREADME = async () => {
      if(!markdown){
         const fetchedREADME = await fetchExtensionReadMe()
        setMarkdown(fetchedREADME)
      }     
    }
    fetchREADME()
  }, [])

  if(databases && !databases[0] && markdown){
     return (<Detail markdown={markdown}/>)
  }
  
  return (
    <Form 
      isLoading={isLoading} 
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <SubmitFormAction 
              title='Create Page'
              icon={Icon.Plus}
              onSubmit={handleSubmit}/>
            </ActionPanel.Section>
        </ActionPanel>
      }>
      <Form.Dropdown 
        key='database'
        id='database'
        title={'Database'}
        onChange={setDatabaseId}
        storeValue>
          {databases?.map((d) => {
            return (
              <Form.Dropdown.Item
                key={d.id} 
                value={d.id} 
                title={(d.title ? d.title : 'Untitled') }
                icon={((d.icon_emoji) ? d.icon_emoji : ( d.icon_file ?  d.icon_file :  ( d.icon_external ?  d.icon_external : Icon.TextDocument))) } />
            )
          })}
      </Form.Dropdown>
      <Form.Separator />
      {databaseProperties?.map((dp) => {
        const key = 'property::'+dp.type+'::'+dp.id;
        const id = key;
        const title = dp.name;
        var placeholder = dp.type.replace(/_/g, ' ');
        placeholder = placeholder.charAt(0).toUpperCase() + placeholder.slice(1);

        switch (dp.type) {
          case 'date':
            return (<Form.DatePicker key={key} id={id} title={title} />)
            break
          case 'checkbox':
            return (<Form.Checkbox key={key} id={id} title={title} label={placeholder} />)
            break
          case 'select':
           return (<Form.Dropdown key={key} id={id} title={title} >
                {dp.options?.map((opt) => {
                  return (<Form.Dropdown.Item  
                    key={'option::'+opt.id} 
                    value={opt.id} 
                    title={opt.name}
                    icon={(opt.color ? {source: Icon.Dot, tintColor: notionColorToTintColor(opt.color)} : undefined)}/>)
                })}
              </Form.Dropdown>
            )
            break
          case 'multi_select':
            return (<Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                {dp.options?.map((opt) => {
                  return (<Form.TagPicker.Item  
                    key={'option::'+opt.id} 
                    value={opt.id} 
                    title={opt.name}
                    icon={(opt.color ? {source: Icon.Dot, tintColor: notionColorToTintColor(opt.color)} : undefined)}/>)
                })}
              </Form.TagPicker>
            )            
            break
          case 'relation':
            return (<Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                {relationsPages[dp.relation_id]?.map((rp) => {
                  return (<Form.TagPicker.Item  
                      key={'relation::'+rp.id} 
                      value={rp.id} 
                      title={rp.title}
                      icon={{source: ((rp.icon_emoji) ? rp.icon_emoji : ( rp.icon_file ?  rp.icon_file :  ( rp.icon_external ?  rp.icon_external : Icon.TextDocument)))}}/>)
                })}
              </Form.TagPicker>
            )            
            break
          case 'people':
            return (<Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                {users?.map((u) => {
                  return (<Form.TagPicker.Item  
                      key={'people::'+u.id} 
                      value={u.id} 
                      title={u.name}
                      icon={{source: u.avatar_url, mask: ImageMask.Circle}}/>)
                })}
              </Form.TagPicker>
            )            
            break
          default:
            return (<Form.TextField key={key} id={id} title={title} placeholder={placeholder} />)
        }
      })}
    </Form>
  )
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

async function storeDatabases(database: Database[]) {
  const data = JSON.stringify(database)
  await setLocalStorageItem('DATABASES', data)
}

async function loadDatabases() {
  const data: string | undefined = await getLocalStorageItem('DATABASES')
  return data !== undefined ? JSON.parse(data) : undefined
}

async function storeDatabaseProperties(databaseId: string, databaseProperties: DatabaseProperty[]) {
  const data = JSON.stringify(databaseProperties)
  await setLocalStorageItem('DATABASE_PROPERTIES_'+databaseId, data)
}

async function loadDatabaseProperties(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem('DATABASE_PROPERTIES_'+databaseId)
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

async function storeUsers(users: User[]) {
  const data = JSON.stringify(users)
  await setLocalStorageItem('USERS', data)
}

async function loadUsers() {
  const data: string | undefined = await getLocalStorageItem('USERS')
  return data !== undefined ? JSON.parse(data) : undefined
}
