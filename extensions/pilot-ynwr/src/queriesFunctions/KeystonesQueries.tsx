import { getPreferenceValues, showToast } from "@raycast/api"
import { APIResponseError, Client } from "@notionhq/client"
import { CreatePageParameters, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints"
import { Pref } from "../interfaces/itemsInterfaces"
import { getAPIError, getAPIidFromLink } from "../tools/generalTools"

const getID = async () => {
    const token = getAPIidFromLink(getPreferenceValues<Pref>().keystoneAPIID)
    return token
}

export const QueryAddKeystone = async (name:string, date:string, projectID:string, todos:object[], notion:Client|undefined) => {
    const idDB = await getID()
    await notion?.pages.create(addKeystoneJson(name, date, projectID, todos,idDB) as CreatePageParameters)
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Keystone')})})
    return true
}

export const QueryChangeDateKeystone = async (id:string, date:string, notion:Client|undefined) => {
    await notion?.pages.update(changeDateJson(id, date) as UpdatePageParameters)
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Keystone')})})
}

const addKeystoneJson = (name:string, date:string, projectID:string, todos:object[], token:string|undefined) => {
    return {
        "icon": {
            "type": "emoji",
            "emoji":"📋"
        },
        "parent": {
            "type": "database_id",
            "database_id": token,
        },
        "properties": {
            "Name": {
                "title":[{
                    "text": {
                        "content": name
                    }
                }]
            },
            "Date":{
                "date":{
                    "start": date,
                }
            },
            "Projects":{
                "relation": [{
                    "id": projectID
                }]
            },
        }
    }
}

const changeDateJson = (id:string, date:string) => {
    return {
        "page_id":id,
        "properties": {
            "Date":{
                "date":{
                    "start": date,
                }
            },
        }
    }
}