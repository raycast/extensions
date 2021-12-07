import { 
  preferences, 
  FormValues,
  showToast, 
  ToastStyle,  
  Color,
} from '@raycast/api'
import fetch, { Headers } from 'node-fetch'

const headers = new Headers({
  'Authorization': 'Bearer ' + preferences.notion_token.value,
  'Notion-Version': '2021-08-16',
  'Content-Type': 'application/json;charset=UTF-8',
})
const apiURL = 'https://api.notion.com/'

export interface User {
  id: string
  type: string  
  name: string | null
  avatar_url: string | null
}


export interface Database {
  id: string
  last_edited_time: number  
  title: string | null
  icon_emoji: string | null
  icon_file: string | null
  icon_external: string | null
}

export interface DatabaseProperty {  
  id: string
  type: string
  name: string
  options: DatabasePropertyOption[]
  relation_id: string | undefined
}

export interface DatabasePropertyOption {
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

export interface PageContent {  
  markdown: string | undefined
  blocks: Record<string,any>[]
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
export async function fetchDatabaseProperties(databaseId: string): Promise<DatabaseProperty[]> {
  const databaseProperties: DatabaseProperty[] = await rawDatabaseProperties(databaseId);
  return databaseProperties;
}

// Raw function for fetching databases
async function rawDatabaseProperties(databaseId: string): Promise<DatabaseProperty[]> {
  
  const databaseProperties: DatabaseProperty[] = [];
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

      let databaseProperty = {
        id: property.id as string,
        type: property.type as string,
        name: name as string,
        options: [] as DatabasePropertyOption[]
      }

      switch (property.type) {
        case 'select':
          databaseProperty.options.push({id:'_select_null_', name: 'No Selection'} as DatabasePropertyOption)
          databaseProperty.options = databaseProperty.options.concat(property.select.options)
          break
        case 'multi_select':
          databaseProperty.options = property.multi_select.options
          break
        case 'relation':
          databaseProperty.relation_id = property.relation.database_id
          break
      }

      databaseProperties.push(databaseProperty)
    })

    return databaseProperties
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch database properties')
    throw new Error('Failed to fetch database properties')
  }
}


// Create database page
export async function queryDatabase(databaseId: string, query: { title: string | undefined } | undefined): Promise<Page[]> {
  const pages: Page[] = await rawQueryDatabase(databaseId, query);
  return pages;
}

// Raw function to query databases
async function rawQueryDatabase(databaseId: string, query: { title: string | undefined } | undefined): Promise<Page[]> {
  try {

    var requestBody = {
      page_size: 100,
      sorts:[{
        direction:'descending',
        timestamp:'last_edited_time'
      }]
    } as Record<string,any>

    if(query && query.title){
      requestBody.filter = {
        and: [{
          property: 'title',
          title: {
            contains: query.title
          }
        }]
      }
    }



    const response = await fetch(
      apiURL + `v1/databases/${databaseId}/query`,
      {
        method: 'post',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    )
    const json = await response.json()

    if(json.object === 'error'){
      showToast(ToastStyle.Failure, json.message)
      return []
    }

    const fetchedPages = pageListMapper(json.results as Record<string,any>[])

    return fetchedPages   
    
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to query databases')
    throw new Error('Failed to query databases')
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
          case 'relation':
            const relation_values: Record<string,string>[]= [];
            value.map(function (relation_page_id: string){
              relation_values.push({id: relation_page_id})
            })
            requestBody.properties[propId] = {
              relation: relation_values
            }
            break
          case 'people':
            const people_values: Record<string,string>[]= [];
            value.map(function (user_id: string){
              people_values.push({id: user_id})
            })
            requestBody.properties[propId] = {
              people: people_values
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


// Patch page
export async function patchPage(pageId: string, properties: Record<string,any>): Promise<Page> {
  const page: Page = await rawPatchPage(pageId, properties);
  return page;
}
// Raw function for updating page
async function rawPatchPage(pageId: string, properties: Record<string,any>): Promise<Page> {
  try {

    const requestBody = {
      properties: properties
    }

    const response = await fetch(
      apiURL + `v1/pages/${pageId}`,
      {
        method: 'patch',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    )
    const json = await response.json() as Record<string,any>

    const page = pageMapper(json)

    return page
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to update page')
    throw new Error('Failed to update page')
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


// Fetch page content
export async function fetchPageContent(pageId: string): Promise<PageContent> {

  const fetchedPageContent = await rawFetchPageContent(pageId) as (Record<string,any> | null)

  var pageContent: PageContent = {
    blocks:[],
    markdown: ''
  }

  if(fetchedPageContent && fetchedPageContent.blocks){
    pageContent = fetchedPageContent as PageContent;
    pageContent.markdown = ''
    
    const pageBlocks = pageContent.blocks;
    pageBlocks.forEach(function(block: Record<string,any>){
      try {
        if(block.type !== 'image'){
          var tempText = '';

          if(block[block.type].text[0]){


            try {
              block[block.type].text.forEach(function(text: Record<string,any>){
                if(text.plain_text){
                  tempText+=notionTextToMarkdown(text)
                }
              });

            }catch(e){

            }

          }else {
            if(block[block.type].text.plain_text){
              tempText+=notionTextToMarkdown(block[block.type].text)
            }
          }

        pageContent.markdown+=notionBlockToMarkdown(tempText, block)+'\n'

        }else{
          pageContent.markdown+='![image]('+block.image.file.url+')'+'\n'
        }
      }catch(e){

      }

    })

    if(!pageBlocks[0]) {
      pageContent.markdown += '*Page is empty*'
    }
  }
  
  return pageContent;
}

// Raw function for fetching page content
async function rawFetchPageContent(pageId: string): Promise<PageContent | null> {
  
  try {
    const response = await fetch(
      apiURL + `v1/blocks/${pageId}/children`,
      {
        method: 'get',
        headers: headers
      }
    )
    const json = await response.json()

    if(json.object === 'error'){
      showToast(ToastStyle.Failure, json.message)
      return null
    }

    const blocks = json.results as Record<string,any>[]

    return { blocks } as PageContent
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch page content')
    throw new Error('Failed to fetch page content')
  }
}

// Fetch users
export async function fetchUsers(): Promise<User[]> {
  const users: User[] = await rawListUsers();
  return users;
}

// Raw function for fetching users
async function rawListUsers(): Promise<User[]> {
  
  try {
    const response = await fetch(
      apiURL + `v1/users`,
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

    const users = recordsMapper({ 
      sourceRecords : json.results as any[],
      models : [
        { targetKey : 'id', sourceKeys : ['id']},
        { targetKey : 'name', sourceKeys : ['name']},
        { targetKey : 'type', sourceKeys : ['type']},
        { targetKey : 'avatar_url', sourceKeys : ['avatar_url']}          
      ] as any
    }) as User[];
    

    return users.filter(function (user){
      return user.type === 'person'
    })
  } catch (err) {
    console.error(err)
    showToast(ToastStyle.Failure, 'Failed to fetch users')
    throw new Error('Failed to fetch users')
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
      ] as any
    }) as Page;


  if(page.object === 'page'){
    const pageProperties = jsonPage.properties
    const propertyKeys = Object.keys(pageProperties);
    page.title = 'Untitled'
    page.properties = {}

    propertyKeys.forEach(function (pk){
      const pageProperty = pageProperties[pk];

      // Save page title
      if(pageProperty.type === 'title'){
        if(pageProperty.title[0] && pageProperty.title[0].plain_text){
          page.title = pageProperty.title[0].plain_text
        }
      }

      // Save page property
      propertyKeys.forEach(function (name){
        const property = pageProperties[name]
        property.name = name
        page.properties[property.id] = property
      })
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


function notionBlockToMarkdown(text: string, block: Record<string,any>): string {
  const blockValue: Record<string,any> = block[block.type as string]
  switch(block.type as string) { 
    case ('heading_1'): { 
      return '# '+text
    }
    case ('heading_2'): { 
      return '## '+text
    }
    case ('heading_3'): { 
      return '### '+text
    }
    case ('bulleted_list_item'): { 
      return '- '+text
    }
    case ('numbered_list_item'): { 
      return '1. '+text
    } 
    case ('to_do'): { 
      return '\n '+(blockValue.checked ? '☑ ': '☐ ')+text
    } 

    default: { 
      return text
    } 
  }
}

function notionTextToMarkdown (text: Record<string,any>): string {
  var plainText = text.plain_text;
  if(text.annotations.bold as boolean){
    plainText = '**'+plainText+'**'
  }else if(text.annotations.italic as boolean){
    plainText = '*'+plainText+'*'
  }else if(text.annotations.code as boolean){
    plainText = '`'+plainText+'`'
  }

  if(text.href){
    if(text.href.startsWith('/')){
      plainText = '['+plainText+'](https://notion.so'+text.href+')'
    }else{
      plainText = '['+plainText+']('+text.href+')'
    }
  }

  return plainText
}


export function notionColorToTintColor (notionColor: string | undefined): Color {

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

  if(notionColor === undefined){
    return colorMapper['default']
  }
  return colorMapper[notionColor] 
}

