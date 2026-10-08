import { LocalStorage } from "@raycast/api";
import { AthomCloudAPI } from "homey-api";

export class Storage extends AthomCloudAPI.StorageAdapter {
  async get(): Promise<object> {
    const data = await LocalStorage.getItem<string>("athom");
    return data ? (JSON.parse(data) as object) : {};
  }
  async set(value: object): Promise<void> {
    return LocalStorage.setItem("athom", JSON.stringify(value));
  }
}
