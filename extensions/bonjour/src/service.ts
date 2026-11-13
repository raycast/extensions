import { Cache, Color } from '@raycast/api'
import bonjour, { RemoteService } from 'bonjour'
import { execFile } from 'child_process'
import { promisify } from 'util'
const execFileAsync = promisify(execFile)

export const KEY = '$ervices'
export const cache = new Cache()

export async function getStatus(url: string): Promise<Color> {
  try {
    await execFileAsync('curl',
      ['-I', '--', url],
      {
        timeout: 1000,
      })
    return Color.Green
  } catch {
    return Color.Red
  }
}

export interface HttpService extends RemoteService {
  url: string
  urls: string[]
}

export class Http {

  static set services(value: HttpService[]) {
    value
      ? cache.set(KEY, JSON.stringify(Object.values(value)))
      : cache.remove(KEY)
  }

  static get services(): HttpService[] {
    const _cache = cache.get(KEY)

    try {
      return _cache
        ? (JSON.parse(_cache) as HttpService[]).sort((a, b) => {
            return a.name.localeCompare(b.name)
          }).map((service) => {
            return {
              ...service,
              url: `http://${service.host.includes(':')
                ? `[${service.host}]` : service.host
              }:${service.port}`,
              urls: service.addresses.map((address) => {
                return `http://${address.includes(':')
                  ? `[${address}]` : address
                }:${service.port}`
              }),
            } as HttpService
          })
        : []
    } catch {
      return []
    }
  }

  static fetch() {
    bonjour().find({ type: 'http' }, (service: RemoteService) => {
      this.services = Object.values({
        ...(this.services ?? []).reduce((result, service) => {
          return {
            ...result,
            [service.name]: service,
          }
        }, {}),
        [service.name]: service,
      })
    })
  }

}
