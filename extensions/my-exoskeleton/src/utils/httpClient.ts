import axios, { CreateAxiosDefaults } from 'axios'

const defaultOptions: CreateAxiosDefaults = {
  timeout: 60 * 1000
}

export function initHttpClient(options?: CreateAxiosDefaults) {
  const instance = axios.create({
    ...defaultOptions,
    ...options
  })

  return instance
}
