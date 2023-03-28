import axios, { CreateAxiosDefaults, AxiosInstance } from 'axios'

const defaultOptions: CreateAxiosDefaults = {
  timeout: 60 * 1000
}

export function initHttpClient(options?: CreateAxiosDefaults): AxiosInstance {
  return axios.create({
    ...defaultOptions,
    ...options
  })
}
