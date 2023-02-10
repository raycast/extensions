import { getPreferenceValues, Cache } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import parse from 'url-parse'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import axios, { AxiosRequestConfig } from 'axios'
import { Preferences } from '../types/global'
import {
  MeResponse,
  PostFileResponse,
  PostMemoParams,
  MemoInfoResponse,
  TagResponse,
} from '../types/request'

const cache = new Cache()

const parseResponse = async (response: Response) => {
  const cookie = response.headers.get('Set-Cookie')

  if (cookie) {
    cache.set('cookie', cookie)
  }
  const data = await response.json()
  return data
}

const getOpenApi = () => {
  const preferences = getPreferenceValues<Preferences>()

  const { openApi } = preferences
  return openApi
}

export const getOriginUrl = () => {
  const { origin } = parse(getOpenApi())
  return origin
}

export const getRequestUrl = (path = '') => {
  const origin = getOriginUrl()
  const url = `${origin}${path}`
  return url
}

const getOpenId = () => {
  const { query } = parse(getOpenApi())
  const parseQuery = parse.qs.parse(query)

  return parseQuery.openId
}

const getUseFetch = <T>(url: string, options: Record<string, any>) => {
  return useFetch<T>(url, {
    headers: {
      'Content-Type': 'application/json',
      cookie: cache.get('cookie') || '',
    },
    parseResponse,
    ...options,
  })
}

const getFetch = <T>(options: AxiosRequestConfig) => {
  return axios<T>({
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      cookie: cache.get('cookie') || '',
    },
    ...options,
  }).then((res) => {
    if (res?.headers?.['set-cookie']?.length) {
      const cookie = res.headers['set-cookie'].reduce((acc, cur) => {
        return acc + cur
      }, '')
      cache.set('cookie', cookie)
    }

    return res.data
  })
}

export const getMe = () => {
  return getUseFetch<MeResponse>(
    getRequestUrl(`/api/user/me?openId=${getOpenId()}`),
    {}
  )
}

export const sendMemo = (data: PostMemoParams) => {
  return getFetch<MemoInfoResponse>({
    url: getOpenApi(),
    method: 'POST',
    data,
  })
}

export const getTags = () => {
  const url = getRequestUrl(`/api/tag?openId=${getOpenId()}`)

  return getUseFetch<TagResponse>(url, {})
}

export const postFile = (filePath: string) => {
  const readFile = fs.readFileSync(filePath)

  const formData = new FormData()
  formData.append('file', readFile, {
    filename: path.basename(filePath),
    contentType: mime.getType(filePath) || undefined,
  })

  return getFetch<PostFileResponse>({
    url: getRequestUrl(`/api/resource/blob?openId=${getOpenId()}`),
    method: 'POST',
    data: formData,
    headers: {},
  })
}
