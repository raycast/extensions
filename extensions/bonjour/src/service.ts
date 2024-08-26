import { Cache } from "@raycast/api";
import Bonjour, { Service } from "bonjour-service";

export const KEY = "services";
export const cache = new Cache();

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
      this.services = (this.services ?? []).concat(
        this.services?.find((s) => s.name == service.name)
          ? []
          : ({
              ...service,
              origin:
                `${service.type}://${service.host}:${service.port}`.toLowerCase(),
            } as HttpService),
      );
    });
  }

  origin: string = "";
}
