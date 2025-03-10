/* eslint-disable class-methods-use-this */
import { LocalStorage } from "@raycast/api";
import { AsyncStorage } from "jotai/vanilla/utils/atomWithStorage";

export class JotaiAsyncStorage<T> implements AsyncStorage<T> {
  async getItem(key: string, initialValue: T): Promise<T> {
    const item = await LocalStorage.getItem(key);
    return typeof item === "string" ? (JSON.parse(item) as T) : initialValue;
  }

  setItem = (key: string, newValue: T) => LocalStorage.setItem(key, JSON.stringify(newValue));

  removeItem = (key: string) => LocalStorage.removeItem(key);
}
