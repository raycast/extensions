import { LocalStorage } from "@raycast/api";
import { DNSItem } from "../types/types";

class StorageUtils {
  static get(key: string): Promise<LocalStorage.Value | undefined> {
    return LocalStorage.getItem(key);
  }

  static set(key: string, value: LocalStorage.Value): Promise<void> {
    return LocalStorage.setItem(key, value);
  }

  static async addDNS(dns: DNSItem) {
    const key = encodeURI(dns.title);
    await this.set(key, JSON.stringify(dns));
    return dns;
  }

  static listDNS(): Promise<LocalStorage.Values> {
    return LocalStorage.allItems();
  }

  static deleteDNS(dns: DNSItem): Promise<void> {
    const key = encodeURI(dns.title);
    return LocalStorage.removeItem(key);
  }
}

export default StorageUtils;
