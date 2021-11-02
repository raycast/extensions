import {
  render,
  ActionPanel,
  SubmitFormAction,
  PushAction,
  Color,
  Icon,
  List,
  Form,
  FormValues,
  OpenInBrowserAction,
  preferences,
  showToast,
  ToastStyle,
  useNavigation,
} from '@raycast/api'
import { randomUUID } from 'crypto'
import { useEffect, useState } from 'react'
import useInterval from './use-interval'
import {
  Database,
  DatabasePropertie,
  Page,
  fetchDatabases,
  fetchDatabaseProperties,
  createDatabasePage,
} from './notion'



export default function CreateDatabaseForm(): JSX.Element {
  // Get preference values
  const notion_token = String(preferences.notion_token.value)
  const notion_workspace_slug = String(preferences.notion_workspace_slug.value)
  if (notion_token.length !== 50) {
    showToast(ToastStyle.Failure, 'Invalid token detected')
    throw new Error('Invalid token length detected')
  }

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
  const [databaseProperties, setDatabaseProperties] = useState<DatabasePropertie[]>()  
  const [databaseId, setDatabaseId] = useState<string>()
  const [isLoading, setIsLoading] = useState<boolean>(true)

  
  // Fetch databases
  useEffect(() => {
    const fetchData = async () => {
      const fetchedDatabases = await fetchDatabases()
     
      setDatabases(fetchedDatabases)
      setIsLoading(false)
     
    }
    fetchData()
  }, [])

  // Fetch selected database property
  useEffect(() => {
    const fetchData = async () => {
      if(databaseId){
        setIsLoading(true)
        const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId)     
        setDatabaseProperties(fetchedDatabaseProperties)
        setIsLoading(false)
      }      
    }
    fetchData()
  }, [databaseId])



  return (
    <Form 
      isLoading={isLoading} 
      actions={
        <ActionPanel>
          <ActionPanel.Section title='Environment Variable'>
            <SubmitFormAction 
              title='Update Variable'
              icon={Icon.Pencil}
              onSubmit={handleSubmit}
               />
            </ActionPanel.Section>
        </ActionPanel>
      }>
      <Form.Dropdown 
        key='database'
        id='database'
        title={'Database'}
        onChange={setDatabaseId}>
          {databases?.map((d) => {
            const randomID = randomUUID()
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
        let FormType = Form.TextField
        let placeholder = dp.type.replace(/_/g, ' ')
        switch (dp.type) {
          case 'date':
            FormType = Form.DatePicker
            break
          case 'checkbox':
            FormType = Form.Checkbox
            break
          case 'select':
            FormType = Form.Dropdown
            break
          case 'multi_select':
            FormType = Form.TagPicker
            break
        }
        return (
          <FormType
            key={'property::'+dp.type+'::'+dp.id}
            id={'property::'+dp.type+'::'+dp.id}
            title={dp.name}
            placeholder={placeholder}
            label={(dp.type === 'checkbox' ? 'Checkbox' : null)}>
              {dp.options?.map((opt) => {
                return (<FormType.Item  
                    key={'option::'+opt.id} 
                    value={opt.id} 
                    title={opt.name}
                    icon={(opt.color ? {source: Icon.Dot, tintColor: notionColorToTintColor(opt.color)} : null)}/>)
              })}
          </FormType>
        )
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


function notionColorToTintColor (notionColor: string): string {
  return {
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
  }[notionColor]
}
