import fetch, { AbortError } from "node-fetch";
import { preferences } from "../../../helpers/preferences";
import { PullRequest } from '../interface'

const url = `https://api.bitbucket.org/2.0/pullrequests/${preferences.accountName}`

const headers = {
  "Content-Type": "application/json",
  "accept": "application/json",
  "Authorization": `Basic ${Buffer.from(preferences.accountName + ":" + preferences.appPassword).toString('base64')}`
}

// TODO: use bitbucket package https://www.npmjs.com/package/bitbucket
export async function pullRequestsGetQuery(): Promise<any> {
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
// fields=${q.fields}&
  return await fetch(`${url}/?sort=${q.sort}&pagelen=${q.pagelen}`, {
    method: "get",
    headers,
  })
}
