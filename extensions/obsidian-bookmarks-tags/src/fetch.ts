import axios from "axios";
import https from "https";
import { Link, Preferences } from "./bookmarks";
import { readFile } from 'node:fs/promises';

const PATH = '.obsidian/plugins/obsidian-local-rest-api/data.json'

export async function searchBookmarks(preferences: Preferences) {
  
  const configFile = `${preferences.vault}/${PATH}`
  const restApiConfigStr = await readFile(configFile, { encoding: 'utf8' })
  const restApiData: {apiKey: string, crypto: {cert: string, privateKey: string, publicKey: string}} = JSON.parse(restApiConfigStr)

  const http = axios.create({
    baseURL: 'https://127.0.0.1:27124',
    // baseURL: 'http://127.0.0.1:27123',
    timeout: 2500,
    headers: {
      common: {
        Authorization: `Bearer ${restApiData.apiKey}`
      }
    },
    httpsAgent: new https.Agent({  
      key: restApiData.crypto.privateKey,
      ca: restApiData.crypto.cert,
    })
  });

    let body = `
    TABLE L.text as text, file.path as path, L.section as section, L.tags as tags
    FROM ${preferences.tagName || '#res'}
    FLATTEN file.lists as L
    WHERE contains(L.text, "http://") or contains(L.text, "https://")
    `

    return await http<Link[]>({
        method: "POST",
        url: '/search/',
        data: body,
        headers: {
          "Content-Type": "application/vnd.olrapi.dataview.dql+txt",
        }
    })
}