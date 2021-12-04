import fetch, { AbortError } from "node-fetch";
import { preferences } from "../../../helpers/preferences";
import { Repository, Patch } from '../interface'

const workspaceUrl = `https://api.bitbucket.org/2.0/repositories/${preferences.workspace}`

const headers = {
  "Content-Type": "application/json",
  "accept": "application/json",
  "Authorization": `Basic ${Buffer.from(preferences.accountName + ":" + preferences.appPassword).toString('base64')}`
}

// TODO: impletement a system to query pages if detect some pagination
export async function repositoryGetQuery(): Promise<any> {
  return await fetch(`${workspaceUrl}?fields=values.uuid,values.links.avatar,values.name,values.full_name,values.description,values.slug&sort=-updated_on&pagelen=50`, {
    method: "get",
    headers,
  })
}

export async function pipelinesGetQuery(repoSlug: string): Promise<any> {
  const q = {
    sort: `-created_on`,
    pagelen: 20,
    fields: `values.uuid,
      values.build_number,
      values.state,
      values.creator.links.avatar.href,
      values.trigger.name,
      values.target.commit
    `.replace(/(\r\n|\n|\r| )/gm, "") // remove all break-lines & spaces created by the backtick string.
  }

  return await fetch(`${workspaceUrl}/${repoSlug}/pipelines/?fields=${q.fields}&sort=${q.sort}&pagelen=${q.pagelen}`, {
    method: "get",
    headers,
  })
}

export async function commitsGetQuery(repoSlug: string): Promise<any> {
  return await fetch(`${workspaceUrl}/${repoSlug}/pipelines/?fields=values.uuid,values.build_number,values.state.result.name,values.creator.links.avatar.href,values.trigger.name&sort=-created_on&pagelen=2`, {
    method: "get",
    headers,
  })
}

// export async function repositoryCreationQuery(body: Repository): Promise<any> {
//   const response = await fetch(`${preferences.rootApiUrl}/api/repositories`, {
//     method: "post",
//     body: JSON.stringify({
//       text: body.text,
//       tags: ["test"],
//       // dashboardId: 47
//       // time: 1638391687000,
//     }),
//     headers: {
//       "Content-Type": "application/json",
//       "accept": "application/json",
//       "Authorization": `Bearer ${preferences.apikey}`
//     }
//   });

//   if (!response.ok) {
//     console.error(response.statusText);
//     return Promise.reject(response.statusText);
//   }
  
//   console.log(response.statusText)
//   console.log(response.text)

//   return response;
// }

// export async function repositoryPatchQuery(valuesToPatch: Patch, id: number): Promise<any> {
//   return await fetch(`${preferences.rootApiUrl}/api/repositories/${id}`, {
//     method: "patch",
//     headers: {
//       "Content-Type": "application/json",
//       "accept": "application/json",
//       "Authorization": `Bearer ${preferences.apikey}`
//     },
//     body: JSON.stringify({
//       text: valuesToPatch.text,
//     })
//   });
// }

// export async function repositoryDeleteQuery(id: number): Promise<any> {
//   return await fetch(`${preferences.rootApiUrl}/api/repositories/${id}`, {
//     method: "delete",
//     headers: {
//       "Content-Type": "application/json",
//       "accept": "application/json",
//       "Authorization": `Bearer ${preferences.apikey}`
//     }
//   });
// }