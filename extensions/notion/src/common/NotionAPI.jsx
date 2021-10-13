import fetch from "node-fetch";
const getMacApps = require("get-mac-apps");

export default function newNotionAPI({ notion_token, notion_workspace_slug }) {
  return new NotionAPI(notion_token.value, notion_workspace_slug.value)
}



function notionAppInstalled(){
   
  
}

var NotionAPI = function(notion_token, notion_workspace_slug) {

	this.notionToken = notion_token;
	this.notionWorkspaceSlug = notion_workspace_slug;

	this.notionHeaders = {
    'content-type': 'application/json;charset=UTF-8',
    'Notion-Version': '2021-08-16',
    'Authorization':'Bearer '+this.notionToken
  }

  this.notionAppInstalled = false;

  getMacApps.isInstalled("Notion")
    .then(isInstalled => this.notionAppInstalled = isInstalled)
    .catch(error => console.log(error.message));

  this.getNotionLinks = function (pageId) {
    var baseURL = 'notion.so/'+this.notionWorkspaceSlug+'/'+pageId.replaceAll('-','')

    var webURL = 'https://'+baseURL

    var appDeeplink;
    if(this.notionAppInstalled){
      appDeeplink = 'notion://'+baseURL
    }

    return {web: webURL, deeplink: appDeeplink} 

  }

}


NotionAPI.prototype.getPageContent = async function (pageId) {

  try {


    const response = await fetch('https://api.notion.com/v1/blocks/'+pageId+'/children', {
    // learn more about this API here: https://graphql-pokemon2.vercel.app/
    method: 'GET',
    headers: this.notionHeaders
  });

    const json = await response.json();
    
    return json.results;

  } catch (error) {
    console.error(error)
    
    return null
  }
}

NotionAPI.prototype.getDatabases = async function () {
	try {

    const requestBody = {
      "sort":{
        "direction":"descending",
        "timestamp":"last_edited_time"
      },
      "filter": {
        "value":"database",
        "property":"object"
      }
    }

    const response = await fetch("https://api.notion.com/v1/search", {
      method: 'POST',
      headers: this.notionHeaders,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();

    return json.results;
  } catch (error) {
    
  }
}




NotionAPI.prototype.getDatabaseProperties = async function (databaseId) {
	try {
    

    const response = await fetch("https://api.notion.com/v1/databases/"+databaseId, {
	    method: 'GET',
	    headers: this.notionHeaders
	});

    const json = await response.json()
    const properties = json.properties;   

    var peoplePropertyKeys = [];
    var relationsCache = {};

    var propKeys = Object.keys(properties);

    for (const propKey of propKeys) {

      if(properties[propKey].type === 'people'){
      peoplePropertyKeys.push(propKey)

      }else if(properties[propKey].type === 'relation'){        
        var raletaionDatabaseId = properties[propKey].relation.database_id;
        var relations = [];

        if(!relationsCache[raletaionDatabaseId]){
          const distantRelations = await this.getDatabaseItems(raletaionDatabaseId);
          relationsCache[raletaionDatabaseId] = distantRelations;
        }
        
        properties[propKey]._relations = relationsCache[raletaionDatabaseId];
      }
    }


    
    
    if(peoplePropertyKeys[0]){
      const users = await this.getUsers();
      peoplePropertyKeys.forEach(function (propKey){
        properties[propKey]._users = users;
      })        
    }

    return properties;

  } catch (error) {
    console.error(error)
  }
}


NotionAPI.prototype.getDatabaseItems = async function (databaseId) {
	try {

    const requestBody = {
      "sort":{
        "direction":"descending",
        "timestamp":"last_edited_time"
      }
    }

    const response = await fetch("https://api.notion.com/v1/databases/"+databaseId+"/query", {
      method: 'POST',
      headers: this.notionHeaders,
      body: JSON.stringify({}),
    });

    const json = await response.json();
    console.log(json)
    return json.results;
  } catch (error) {

  }
}

NotionAPI.prototype.getUsers = async function () {
	try {



    const response = await fetch("https://api.notion.com/v1/users", {
    method: 'GET',
    headers: this.notionHeaders,
  });

    const json = await response.json();   
    return json.results;

  } catch (error) {
    return renderError('Could not load users',error)
  }
}



NotionAPI.prototype.createDatabaseItem = async function (form) {
  try {

    const requestBody = {
      parent: { 
        database_id: form.databaseId
      },
      properties: {}
    }

    delete form.databaseId;

    Object.keys(form).forEach(function (formId){
      let type = formId.match(/(?<=property::).*(?=::)/g)[0]
      let propId = formId.match(new RegExp('(?<=property::'+type+'::).*', 'g'))[0]
      let value = form[formId]

  

      if(value){
        if( type === 'title' ){
          requestBody.properties[propId] = {
            title: [
            { 
              text: {  
                content: value
              }
            }
            ]
          }

        }else if( type === 'number' ){
          requestBody.properties[propId] = {
            number: parseFloat(value)
          }

        }else if( type === 'rich_text' ){
          requestBody.properties[propId] = {
            rich_text: [
            { 
              text: {  
                content: value
              }
            }
            ]
          }

        }else if( type === 'url' ){
          requestBody.properties[propId] = {
            url: value
          }

        }else if( type === 'email' ){
          requestBody.properties[propId] = {
            email: value
          }

        }else if( type === 'phone_number' ){
          requestBody.properties[propId] = {
            phone_number: value
          }

        }else if( type === 'date' ){

          var date_value = {
            start: value
          }

          
          console.log('value',value)
          console.log(form['property::date_end::'+propId])
          if(form['property::date_end::'+propId]){
            date_value.end = form['property::date_end::'+propId]
          }

          requestBody.properties[propId] = {
            date: date_value
          }

        }else if( type === 'checkbox' ){
          requestBody.properties[propId] = {
            checkbox: ((value === 1) ? true : false)
          }

        }else if( type === 'select' && value !== '_select_null_'){

          requestBody.properties[propId] = {
            select: {id: value}
          }

        }else if( type === 'multi_select' ){

          let multi_values = [];
          value.map(function (multi_select_id){
            multi_values.push({id: multi_select_id})
          })

          requestBody.properties[propId] = {
            multi_select: multi_values
          }

        }else if( type === 'people' ){

          let people_values = [];
          value.map(function (people_id){
            people_values.push({
              id: people_id
            })
          })

          requestBody.properties[propId] = {
            people: people_values
          }
        }else if( type === 'relation' ){

          let relation_values = [];
          value.map(function (relation_id){
            relation_values.push({
              id: relation_id
            })
          })

          requestBody.properties[propId] = {
            relation: relation_values
          }
        }
      }
      
    })

      
  console.log(requestBody)

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: this.notionHeaders,
    body: JSON.stringify(requestBody),
  });

  const json = await response.json();


  if(json.id){

    return json

  }else{
    return null
  }



  } catch (error) {  
  
    console.error('Could not create entry', error)

  }
}



NotionAPI.prototype.searchPages = async function (query) {
  try {

    const requestBody = {
      "sort":{
        "direction":"descending",
        "timestamp":"last_edited_time"
      }
    }

    if(query){
      requestBody.query = query
    }

    const response = await fetch("https://api.notion.com/v1/search", {
      method: 'POST',
      headers: this.notionHeaders,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();

    return json.results;

  } catch (error) {  
    return null
  }
}



NotionAPI.prototype.searchDatabasePages = async function (databaseId, query) {

  try {

    var requestBody = {}

    if(query){
      requestBody = {
          "filter": {
            "and": [
              {
                "property": "title",
                  "text": {
                      "contains": query
                  }
              }
            ]
          }
        }
    }

    const response = await fetch("https://api.notion.com/v1/databases/"+databaseId+"/query", {
      method: 'POST',
      headers: this.notionHeaders,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();

    return json.results;

  } catch (error) {
    console.error(error)
    
    return null
  }
}
























