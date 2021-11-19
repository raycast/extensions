import { 
  preferences, 
  FormValues,
  showToast, 
  ToastStyle 
} from '@raycast/api'
import fetch, { Headers } from 'node-fetch'

const headers = new Headers({
  'Authorization': 'Bearer ' + preferences.notion_token.value,
  'Notion-Version': '2021-08-16',
  'Content-Type': 'application/json;charset=UTF-8',
})
const apiURL = 'https://api.notion.com/'

export interface Database {
  id: string
  last_edited_time: number  
  title: string | null
  icon_emoji: string | null
  icon_file: string | null
  icon_external: string | null
}

export interface DatabasePropertie {  
  id: string
  type: string
  name: string
  options: DatabasePropertieOption[]
}

export interface DatabasePropertieOption {
  id: string
  name: string
  color: string | undefined
}

export interface Page {  
  id: string,
  title: string | null
}


// Fetch databases
export async function fetchDatabases(): Promise<Database[]> {
  const databases: Database[] = await rawFetchDatabases();
  return databases;
}

// Raw function for fetching databases
async function rawFetchDatabases(): Promise<Database[]> {
  try {
    const response = await fetch(
      apiURL + `v1/search`,
      {
        method: 'post',
        headers: headers,
        body: JSON.stringify({
          sort:{
            direction:'descending',
            timestamp:'last_edited_time'
          },
          filter: {
            value:'database',
            property:'object'
          }
        })
      }
    )
    const json = await response.json()

    const databases = recordMapper({ 
      sourceRecords : json.results as any[],
      models : [
        { targetKey : 'last_edited_time', sourceKeys : ['last_edited_time']},
        { targetKey : 'id', sourceKeys : ['id']},
        { targetKey : 'title', sourceKeys : ['title','0','plain_text']},
        { targetKey : 'icon_emoji', sourceKeys : ['icon','emoji']},      
        { targetKey : 'icon_file', sourceKeys : ['icon','file','url']},              
        { targetKey : 'icon_external', sourceKeys : ['icon','external','url']},            
      ] as any
    }) as Database[];

    return databases
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch databases')
    throw new Error('Failed to fetch databases')
  }
}


// Fetch database properties
export async function fetchDatabaseProperties(databaseId: string): Promise<DatabasePropertie[]> {
  const databaseProperties: DatabasePropertie[] = await rawDatabaseProperties(databaseId);
  return databaseProperties;
}

// Raw function for fetching databases
async function rawDatabaseProperties(databaseId: string): Promise<DatabasePropertie[]> {
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
    'multi_select'
  ]
  const databaseProperties: DatabasePropertie[] = [];
  try {
    const response = await fetch(
      apiURL + `v1/databases/${databaseId}`,
      {
        method: 'get',
        headers: headers
      }
    )
    const json = await response.json()
    const properties = json.properties as Record<string,any>
    const propertyNames = Object.keys(properties).reverse() as string[]

    propertyNames.forEach(function (name: string){
      let property = properties[name] as Record<string,any>
      if(!supportedPropTypes.includes(property.type))
        return

      let databasePropertie = {
        id: property.id as string,
        type: property.type as string,
        name: name as string,
        options: [] as DatabasePropertieOption[]
      }

      switch (property.type) {
        case 'select':
          databasePropertie.options.push({id:'_select_null_', name: 'No Selection'} as DatabasePropertieOption)
          databasePropertie.options = databasePropertie.options.concat(property.select.options)
          break
        case 'multi_select':
          databasePropertie.options = property.multi_select.options
          break
      }

      databaseProperties.push(databasePropertie)
    })

    return databaseProperties
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch database properties')
    throw new Error('Failed to fetch database properties')
  }
}


// Create database page
export async function createDatabasePage(values: FormValues): Promise<Page> {
  const page: Page = await rawCreateDatabasePage(values);
  return page;
}

// Raw function for creating database page
async function rawCreateDatabasePage(values: FormValues): Promise<Page> {
  try {

    const requestBody = {
      parent: { 
        database_id: values.database
      },
      properties: {}
    } as Record<string,any>

    delete values.database;

    Object.keys(values).forEach(function (formId: string){
      let type = formId.match(/(?<=property::).*(?=::)/g)![0]
      let propId = formId.match(new RegExp('(?<=property::'+type+'::).*', 'g'))![0]
      let value = values[formId]

      if(value){
        switch (type) {
          case 'title':
            requestBody.properties[propId] = {
              title: [
                { 
                  text: {  
                    content: value
                  }
                }
              ]
            }
            break
          case 'number':
            requestBody.properties[propId] = {
              number: parseFloat(value)
            }
            break
          case 'rich_text':
            requestBody.properties[propId] = {
            rich_text: [
                { 
                  text: {  
                    content: value
                  }
                }
              ]
            }
            break
          case 'url':
            requestBody.properties[propId] = {
              url: value
            }
            break
          case 'email':
            requestBody.properties[propId] = {
              email: value
            }
            break
          case 'phone_number':
            requestBody.properties[propId] = {
              phone_number: value
            }
            break
          case 'date':
            const date_value = {
              start: value
            }
            requestBody.properties[propId] = {
              date: date_value
            }
            break
          case 'checkbox':
            requestBody.properties[propId] = {
              checkbox: ((value === 1) ? true : false)
            }
            break
          case 'select':
            if(value !== '_select_null_'){
              requestBody.properties[propId] = {
                select: {id: value}
              }
            }
            break
          case 'multi_select':
            const multi_values: Record<string,string>[]= [];
            value.map(function (multi_select_id: string){
              multi_values.push({id: multi_select_id})
            })

            requestBody.properties[propId] = {
              multi_select: multi_values
            }
            break
        }
      }
      
    })
    const response = await fetch(
      apiURL + `v1/pages`,
      {
        method: 'post',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    )
    const json = await response.json() as Record<string,any>

    const page = {
      id: json.id as string
    } as Page

    return page
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to create page')
    throw new Error('Failed to create page')
  }
}





function recordMapper (mapper: { sourceRecords : any[], models: [{targetKey : string, sourceKeys : string[]}]}): Record<string, any> {
  const sourceRecords = mapper.sourceRecords;
  const models = mapper.models;

  var mappedRecords = [] as any[];

  sourceRecords.forEach(function (sourceRecord){
    var mappedRecord = {} as any;
    models.forEach(function (model){
      const sourceKeys = model.sourceKeys;
      const targetKey = model.targetKey;
      var tempRecord = JSON.parse(JSON.stringify(sourceRecord));
      sourceKeys.forEach(function (sourceKey){
        if(!tempRecord){
          return
        }
        if(sourceKey in tempRecord ){
          tempRecord = tempRecord[sourceKey];
        }else{
          tempRecord = null;
          return
        }
      })
      mappedRecord[targetKey] = tempRecord;
    })
    mappedRecords.push(mappedRecord)
  })
  return mappedRecords;
}
