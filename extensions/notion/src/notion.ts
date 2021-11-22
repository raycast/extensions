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
  object: string
  id: string
  parent_page_id: string | null
  parent_database_id: string | null
  last_edited_time: number  
  title: string | null
  icon_emoji: string | null
  icon_file: string | null
  icon_external: string | null
  url: string
  properties: Record<string, any>
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

    if(json.object === 'error'){
      showToast(ToastStyle.Failure, json.message)
      return []
    }

    const databases = recordsMapper({ 
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

    if(json.object === 'error'){
      showToast(ToastStyle.Failure, json.message)
      return []
    }

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

    const page = pageMapper(json)

    return page
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to create page')
    throw new Error('Failed to create page')
  }
}


// Search pages
export async function searchPages(query: string | undefined): Promise<Page[]> {
  const pages: Page[] = await rawSearchPages(query);
  return pages;
}

// Raw function for searching pages
async function rawSearchPages(query: string | undefined ): Promise<Page[]> {
  try {

    var requestBody = {
      sort:{
        direction:'descending',
        timestamp:'last_edited_time'
      }
    } as Record<string,any>

    if(query){
      requestBody.query = query;
    }

    const response = await fetch(
      apiURL + `v1/search`,
      {
        method: 'post',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    )
    const json = await response.json() as Record<string,any>

    if(json.object === 'error'){
      showToast(ToastStyle.Failure, json.message)
      return []
    }

    const pages = pageListMapper(json.results as Record<string,any>[])

    return pages
  } catch (err) {
    showToast(ToastStyle.Failure, 'Failed to load pages')
    throw new Error('Failed to load pages')
  }
}

// Fetch Extension README
export async function fetchExtensionReadMe(): Promise<string> {
  try {
    var pjson = require('./package.json');
    const response = await fetch(
      `https://raw.githubusercontent.com/raycast/extensions/main/extensions/${pjson.name}/README.md`,
      {
        method: 'get'
      }
    )
    const text = await response.text() as string
    
    return text
  } catch (err) {
    showToast(ToastStyle.Failure, 'Failed to load Extension README')
    throw new Error('Failed to load Extension README')
  }
}




function pageListMapper (jsonPageList: Record<string, any>[]): Page[] {
  const pages: Page[] = [];

  jsonPageList.forEach(function (jsonPage){
    const page = pageMapper(jsonPage);
    pages.push(page);
  })

  return pages
}


function pageMapper (jsonPage: Record<string, any>): Page {
  var page = recordMapper({ 
      sourceRecord : jsonPage,
      models : [
        { targetKey : 'object', sourceKeys : ['object']},
        { targetKey : 'id', sourceKeys : ['id']},
        { targetKey : 'parent_page_id', sourceKeys : ['parent','page_id']},
        { targetKey : 'parent_database_id', sourceKeys : ['parent','database_id']},
        { targetKey : 'last_edited_time', sourceKeys : ['last_edited_time']},
        { targetKey : 'icon_emoji', sourceKeys : ['icon','emoji']},      
        { targetKey : 'icon_file', sourceKeys : ['icon','file','url']},              
        { targetKey : 'icon_external', sourceKeys : ['icon','external','url']},   
        { targetKey : 'url', sourceKeys : ['url']},
        { targetKey : 'properties', sourceKeys : ['properties']}
      ] as any
    }) as Page;

  

  if(page.object === 'page'){
    const propertyKeys = Object.keys(page.properties);


    page.title = 'Untitled'

    propertyKeys.forEach(function (pk){
      if(page.properties[pk].type === 'title'){
        if(page.properties[pk].title[0] && page.properties[pk].title[0].plain_text){
          page.title = page.properties[pk].title[0].plain_text
        }
      }
    })
  } else if(jsonPage.title && jsonPage.title[0] && jsonPage.title[0].plain_text) {
    page.title = jsonPage.title[0].plain_text
  } 
  
  return page;
}


function recordsMapper (mapper: { sourceRecords : any[], models: [{targetKey : string, sourceKeys : string[]}]}): Record<string, any>[] {
  const sourceRecords = mapper.sourceRecords;
  const models = mapper.models;

  var mappedRecords = [] as any[];

  sourceRecords.forEach(function (sourceRecord){
    mappedRecords.push(recordMapper({sourceRecord, models}))
  })

  return mappedRecords;
}


function recordMapper (mapper: { sourceRecord : any, models: [{targetKey : string, sourceKeys : string[]}]}): Record<string, any> {
  const sourceRecord = mapper.sourceRecord;
  const models = mapper.models;

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
  return mappedRecord;
}
