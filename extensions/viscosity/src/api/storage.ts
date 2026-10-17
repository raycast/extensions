import { LocalStorage } from "@raycast/api"
import { StorageKeys } from "@/constants"

export async function getStorageValue(key: string): Promise<string> {
  return (await LocalStorage.getItem<string>(key)) ?? ""
}

export async function setStorageValue(key: string, value: string) {
  await LocalStorage.setItem(key, value)
}

export async function setQuickConnect(name: string) {
  const qc = await getStorageValue(StorageKeys.QuickConnect)
  const newQC = qc === name ? "" : name
  await setStorageValue(StorageKeys.QuickConnect, newQC)
  return newQC
}
