import { Cache, Color, open } from '@raycast/api'
import bonjour, { RemoteService } from 'bonjour'
import { execSync } from 'child_process'

export const KEY = 'services'
export const cache = new Cache()

declare global {
  interface String {
    get available(): boolean
    get status(): Color
    open(): void
  }
}

Object.defineProperties(String.prototype, {

  available: {
    get: function () {
      try {
        return !!execSync(`curl -I ${this}`, {
          timeout: 1000,
        })
      } catch {
        return false
      }
    },
  },

  status: {
    get: function () {
      return this.available
        ? Color.Green
        : Color.Red
    },
  },

  open: {
    value: function () {
      open(this)
    },
  },

})

export interface HttpService extends RemoteService {
  origin: string
  origins: string[]
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
          })
        : []
    } catch {
      return []
    }
  }

  static fetch() {
    bonjour().find({ type: 'http' }, (service: RemoteService) => {
      console.log(service)
      this.services = Object.values({
        ...(this.services ?? []).reduce((result, service) => {
          return {
            ...result,
            [service.name]: service,
          }
        }, {}),

        [service.name]: {
          ...service,
          origin: `http://${service.host}:${service.port}`,
          origins: service.addresses.map((address) => {
            return `http://${address}:${service.port}`
          }),
        } as HttpService,
      })
    })
  }

}
