import fetch from "node-fetch";

const getMacApps = require("get-mac-apps");
const emoji = require('node-emoji');

export default function newSlackAPI(slack_token) {
  return new SlackAPI(slack_token)
}

var SlackAPI = function(slack_token) {

	this.slackToken = slack_token;

	this.slackHeaders = {
    'content-type': 'application/json;charset=UTF-8',
    'Authorization':'Bearer '+this.slackToken
  }  

  return this

}


SlackAPI.prototype.getTeam = async function (callback) {
  try {

    const response = await fetch('https://slack.com/api/team.info?pretty=1', {
      method: 'GET',
      headers: this.slackHeaders
    });

    const json = await response.json();
    
    return json.team;

  } catch (error) {
    console.error(error)    
    return null
  }
}

SlackAPI.prototype.listConversations = async function (callback) {
  try {

    const response = await fetch('https://slack.com/api/conversations.list?pretty=1', {
      method: 'GET',
      headers: this.slackHeaders
    });

    const json = await response.json();
    
    callback(json.channels);

  } catch (error) {
    console.error(error)    
    return null
  }
}

SlackAPI.prototype.listUsers = async function (callback) {
  try {

    const response = await fetch('https://slack.com/api/users.list?pretty=1', {
      method: 'GET',
      headers: this.slackHeaders
    });

    const json = await response.json();
    
    callback(json.members);

  } catch (error) {
    console.error(error)    
    return null
  }
}

SlackAPI.prototype.emojify = function (emojiString){
  return emoji.emojify(emojiString);
}




SlackAPI.prototype.getChannelLinks = function (teamId, channelId) {

  var webURL = 'https://slack.com/app_redirect?channel='+channelId

  var appDeeplink = 'slack://channel?team='+teamId+'&id='+channelId

  return {web: webURL, deeplink: appDeeplink} 

}

SlackAPI.prototype.getUserLinks = function (teamId, userId) {

  var webURL = 'https://slack.com/app_redirect?user='+userId

  var appDeeplink = 'slack://user?team='+teamId+'&id='+userId

  return {web: webURL, deeplink: appDeeplink} 

}

/*
NotionAPI.prototype.getPageContent = async function (pageId) {

  
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















*/








