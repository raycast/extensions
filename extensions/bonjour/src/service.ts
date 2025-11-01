import { Cache, Color } from "@raycast/api";
import Bonjour, { Service } from "bonjour-service";
import { execSync } from "child_process";

export const KEY = "services";
export const cache = new Cache();

declare global {
  interface String {
    get available(): boolean;
    get status(): Color;
  }
}

Object.defineProperties(String.prototype, {
  available: {
    get: function () {
      try {
        return !!execSync(`curl -I http://${this}`);
      } catch {
        return false;
      }
    },
  },

  status: {
    get: function () {
      return this.available ? Color.Green : Color.Red;
    },
  },
});

export class HttpService extends Service {
  static set services(value: HttpService[]) {
    value
      ? cache.set(KEY, JSON.stringify(Object.values(value)))
      : cache.remove(KEY);
  }

  static get services(): HttpService[] {
    const _cache = cache.get(KEY);

    try {
      return _cache
        ? (JSON.parse(_cache) as HttpService[]).sort((a, b) => {
            return a.name.localeCompare(b.name);
          })
        : [];
    } catch {
      return [];
    }
  }

  static fetch() {
    new Bonjour().find({ type: "http" }, (service: Service) => {
      this.services = Object.values({
        ...(this.services ?? []).reduce((result, service) => {
          return {
            ...result,
            [service.name]: service,
          };
        }, {}),

        [service.name]: {
          ...service,
          origin: `http://${service.host}:${service.port}`.toLowerCase(),
        } as HttpService,
      });
    });
  }

  origin: string = "";
}
