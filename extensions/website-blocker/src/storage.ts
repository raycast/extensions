import { LocalStorage } from "@raycast/api";

export async function getStoredHosts() {
  const storage = await LocalStorage.getItem<string>("hosts");
  const hosts = !storage ? [] : (JSON.parse(storage) as string[]);
  return hosts;
}

export async function addHostToStorage(host: string) {
  const hostClean = host.toLowerCase().trim();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,})$/.test(hostClean)) {
    throw new Error("This is not a valid host");
  }
  const hosts = await getStoredHosts();
  const hostsSet = new Set(hosts.slice().reverse());
  hostsSet.add(hostClean);
  const hostsArr = Array.from(hostsSet).reverse();
  await LocalStorage.setItem("hosts", JSON.stringify(hostsArr));
}

export async function removeHostFromStorage(host: string) {
  const hostClean = host.toLowerCase().trim();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,})$/.test(hostClean)) {
    throw new Error("This is not a valid host");
  }
  const hosts = await getStoredHosts();
  const hostsSet = new Set(hosts);
  hostsSet.delete(hostClean);
  const hostsArr = Array.from(hostsSet);
  await LocalStorage.setItem("hosts", JSON.stringify(hostsArr));
}
