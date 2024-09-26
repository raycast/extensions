import { getPreferenceValues, showToast } from "@raycast/api"
import { APIResponseError, Client } from "@notionhq/client"
import { CreatePageParameters, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints"
import { Pref } from "../interfaces/itemsInterfaces"
import { getAPIError, getAPIidFromLink } from "../tools/generalTools"


const getID = async () => {
    const token = getAPIidFromLink(getPreferenceValues<Pref>().journalAPIID)
    return token
}

export const QueryAddJournal = async (text:string,date:string, projectName:string,projectID:string, name:string, notion:Client|undefined) => {
    const idDB = await getID()
    await notion?.pages.create(addJournalJson(text, date, projectName,projectID, name,idDB) as CreatePageParameters)
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Journal')})})
    return true
}



export const addJournalJson = (text:string,date:string, projectName:string,projectID:string, name:string, token:string|undefined) => {
    return {
        "icon": {
            "type": "emoji",
            "emoji":"📃"
        },
        "parent": {
            "type": "database_id",
            "database_id": token,
        },
        "children": [{
            "object": "block",
            "paragraph": {
                "rich_text": [
                    {
                        "text": {
                            "content": text
                        }
                    }
                ]
            }
        }],
        "properties": {
            "Name": {
                "title": [{
                    "text":{
                        "content":name
                    }
                }]
            },
            "Date": {
                "date": {
                    "start": date
                }
            },
            "Projects": {
                "relation": [
                    {
                        "id":projectID
                    }
                ]
            },
            "Text":{
                "rich_text":[
                    {
                        "text": {
                            "content":text
                        }
                    }
                ]
            }
        }
    }
}

export const QueryChangeDateJournal = async (id:string, start:string, notion:Client|undefined) => {
    await notion?.pages.update(changeDateJson(id, start) as UpdatePageParameters)
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Journal')})})
    return true
}

const changeDateJson = (id:string, start:string) => {
    return {
        page_id:id,
        properties:{
            Date:{
                date:{
                    start:start,
                }
            }
        }
    }
}

export const QuerySetNameJournal = async (journalID:string,name:string,notion:Client|undefined) => {
    await notion?.pages.update(addNewNameJournalJson(name,journalID))
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Journal')})})
    return true
}

const addNewNameJournalJson = (name:string, id:string) => {
    return {
        "page_id":id,
        "properties": {
            "Name": {
                "title": [{
                    "text":{
                        "content":name
                    }
                }]
            } 
        }
    }
}

export const QueryAddTextJournal = async(journalID:string, text:string,notion:Client|undefined) => {
    await notion?.pages.update(addText(journalID, text))
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Journal')})})
    return true
}
const addText = (journalID:string, text:string) => {
    return {
        "page_id":journalID,
        "properties":{
            "Text":{
                "rich_text":[
                    {
                        "text": {
                            "content":text
                        }
                    }
                ]
            }
        }
    }
}


export const QuerySetTextJournal = async(journalID:string, text:string,notion:Client|undefined) => {
    await notion?.pages.update(setNexTextToJournalJson(text, journalID))
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Journal')})})
    return true
}


//JSON ------------------------------------------------------

const setNexTextToJournalJson = (text:string, id:string) => {
    return {
        "page_id":id,
        "children": [{
            "object": "block",
            "paragraph": {
                "rich_text": [
                    {
                        "text": {
                            "content": text
                        }
                    }
                ]
            }
        }],
    }
}