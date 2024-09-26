
import { APIResponseError, Client } from "@notionhq/client"
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints"
import { getPreferenceValues, showToast } from "@raycast/api"
import { Pref } from "../interfaces/itemsInterfaces"
import { getAPIError, getAPIidFromLink } from "../tools/generalTools"


const getToken = async () => {
    const token = getAPIidFromLink(getPreferenceValues<Pref>().projectAPIID)
    return token
}

export const QueryAddSubpages = async(name:string, icon:string, projectID:string,notion:Client|undefined) => {
    const idDB = await getToken()
    await notion?.pages.create(addSubProjectsJson(name,icon,projectID,idDB) as CreatePageParameters)
    .catch((e:APIResponseError) => {return showToast({title:getAPIError(e.code as string, 'Project')})})
    return true
}

const addSubProjectsJson = (name:string,icon:string, projectID:string, token:string|undefined) => {
    return {
        "parent": {
            "type": "database_id",
            "database_id": token,
        },
        "icon":{
            "emoji":icon
        },
        "properties": {
            "Name": {
                "title": [{
                    "text":{
                        "content": name
                    }
                }]
            },
            "Parent": {
                "relation":[{
                    "id":projectID
                }]
            },
            "Active": {
                "checkbox": true
            }
        },
    }
}