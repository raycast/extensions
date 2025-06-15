import { withCache } from "@raycast/utils";
import { ExternalApp } from "../../lib/types/externalApp";
import { InstalledService, Service, ServiceCategory, ServiceType } from "../../lib/types/service";
import { Herd } from "../Herd";

export class Services {
  private static getServices = withCache(Services.fetchServices, {
    maxAge: 60 * 60 * 1000,
  });

  static clearCache() {
    this.getServices.clearCache();
  }

  static async all(): Promise<Service[]> {
    const availableServices = await this.getServices();

    if (!availableServices) return [];

    const elements = availableServices.split(", ");

    const services: Service[] = [];
    let service: Partial<Service & { [key: string]: string | boolean }> = {};

    for (const elementRaw of elements) {
      let element = elementRaw;

      if (element.startsWith("services:")) {
        element = element.replace("services:", "");
      }

      const [key, value] = element.split(":");

      switch (key) {
        case "category":
          service.category = value.split(",") as ServiceCategory[];
          break;
        case "name":
          service.label = value;
          break;
        case "type":
          service.type = value as ServiceType;
          break;
        case "version":
          service.version = value;
          break;
        case "status":
          service.status = value as "installed" | "not installed" | undefined;
          break;
        case "default_port":
          service.defaultPort = Number(value);
          break;
        case "installedServices":
          service.installedServices = await this.parseInstalledServices(element);

          break;
        default:
          break;
      }

      if (Object.keys(service).length === 7) {
        services.push(service as Service);
        service = {};
      }
    }

    return services;
  }

  static async startService(installedService: InstalledService): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`
	start extraservice "${installedService.type.toLowerCase()}" port "${installedService.port}" version "${installedService.version}"
        `);
    return true;
  }

  static async stopService(installedService: InstalledService): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`
	stop extraservice "${installedService.type.toLowerCase()}" port "${installedService.port}" version "${installedService.version}"
        `);
    return true;
  }

  private static async parseInstalledServices(element: string): Promise<InstalledService[]> {
    const str = element.replace("installedServices:", "");

    if (!str) return [];

    try {
      const result = JSON.parse(str) as InstalledService[];
      const values = Object.values(result);

      const services = await Promise.all(
        values.map(async (app: InstalledService) => {
          const filteredApps = (
            await Promise.all(
              app.apps.map(async (externalApp) => {
                const isInstalled = await Herd.ExternalApps.isInstalled(externalApp.name);
                return isInstalled ? externalApp : null;
              }),
            )
          ).filter((a): a is ExternalApp => a !== null);

          return {
            ...app,
            apps: filteredApps,
          };
        }),
      );

      return services;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  private static async fetchServices(): Promise<string> {
    return await Herd.runAppleScript<string>(`get available extraservices with withInstalledServices`);
  }
}
