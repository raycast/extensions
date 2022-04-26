import { getCurrentBackend } from '../utils'
import axios, { AxiosError } from 'axios'
import https from 'https'

const request = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 20000,
})

request.interceptors.request.use(
  async function (config) {
    const { url, xKey } = await getCurrentBackend()
    config.baseURL = `${url}/v1`
    config.headers = { 'X-Key': xKey }
    return config
  },
  function (error: AxiosError) {
    return Promise.reject(error)
  },
)

export default request
