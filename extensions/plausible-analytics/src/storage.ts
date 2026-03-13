import { LocalStorage } from "@raycast/api";

export class Storage {
  public static async getDomains() {
    const data = await LocalStorage.getItem<string>("domains");
    return data ? JSON.parse(data) : [];
  }

  public static async setDomains(domains: string[]) {
    await LocalStorage.setItem("domains", JSON.stringify(domains));
  }

  public static async addDomain(domain: string) {
    const domains = new Set<string>(await Storage.getDomains());
    domains.add(domain);
    await Storage.setDomains([...domains]);
  }

  public static async removeDomain(domain: string) {
    const domains = await Storage.getDomains();
    const index = domains.indexOf(domain);
    if (index > -1) {
      domains.splice(index, 1);
    }
    await Storage.setDomains(domains);
  }
}
