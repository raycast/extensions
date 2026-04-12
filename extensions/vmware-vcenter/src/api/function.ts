import { Server, Vm, NetworkSummary, StoragePoliciesSummary, Network, Host, Datastore } from "./types";
import { LocalStorage, Cache } from "@raycast/api";
import { vCenter } from "./vCenter";

const raycastCache = new Cache();

const LocalStorageItemServer = "server";

/* Type Safe JSON.parse() */
const jsonParse = <T>(value: string) => {
  try {
    const data: T = JSON.parse(value);
    return data;
  } catch {
    return undefined;
  }
};

/* Get Config */
export async function GetConfig(): Promise<Server[]> {
  /* Get Saved VMware Servers */
  const dataRaw = await LocalStorage.getItem<string>(LocalStorageItemServer);
  if (!dataRaw) throw Error("VMware Server is not configured");

  /* Parse Data */
  const data = jsonParse<Server[]>(dataRaw);
  if (!data) {
    /* Throw Error and purge LocalStorage if data are corrupted */
    await LocalStorage.removeItem(LocalStorageItemServer);
    throw Error("Corrupted data on LocalStorage Item 'server'");
  }
  return data;
}

/* Get VMware Server Names Array */
export async function GetServerNames(): Promise<string[]> {
  /* Get Saved VMware Servers */
  const dataRaw = await LocalStorage.getItem<string>(LocalStorageItemServer);
  if (!dataRaw) throw Error("VMware Server is not configured");

  /* Parse Data */
  const data = jsonParse<Server[]>(dataRaw);
  if (!data) {
    /* Throw Error and purge LocalStorage if data are corrupted */
    await LocalStorage.removeItem(LocalStorageItemServer);
    throw Error("Corrupted data on LocalStorage Item 'server'");
  }

  /* Return Sorted Array */
  const output = data.map((value) => value.name);
  if (output.length > 1) {
    output.sort();
    output.unshift("All");
  }
  return output;
}

/* Get VMware Server Config */
export async function GetServerConfig(name: string): Promise<Server> {
  /* Get Saved VMware Servers */
  const dataRaw = await LocalStorage.getItem<string>(LocalStorageItemServer);
  if (!dataRaw) throw Error("VMware Server is not configured");

  /* Parse Data */
  const data = jsonParse<Server[]>(dataRaw);
  if (!data) {
    /* Throw Error and purge LocalStorage if data are corrupted */
    await LocalStorage.removeItem(LocalStorageItemServer);
    throw Error("Corrupted data on LocalStorage Item 'server'");
  }

  /* Filter Data */
  const server = data.find((value) => value.name === name);
  if (!server) throw Error(`VMware Server with name '${name}' is not configured`);

  return server;
}

/* Remove VMware Server Config by Name */
export async function RemoveServerConfig(name: string): Promise<void> {
  /* Get Saved VMware Servers */
  const dataRaw = await LocalStorage.getItem<string>(LocalStorageItemServer);
  if (!dataRaw) throw Error("VMware Server is not configured");

  /* Parse Data */
  const data = jsonParse<Server[]>(dataRaw);
  if (!data) {
    /* Throw Error and purge LocalStorage if data are corrupted */
    await LocalStorage.removeItem(LocalStorageItemServer);
    throw Error("Corrupted data on LocalStorage Item 'server'");
  }

  /* Filter Data */
  const newData = data.filter((value) => value.name !== name);
  await LocalStorage.setItem(LocalStorageItemServer, JSON.stringify(newData));
}

/* Add VMware Server Config */
export async function AddServerConfig(config: Server): Promise<void> {
  /* Get Saved VMware Servers */
  const dataRaw = await LocalStorage.getItem<string>(LocalStorageItemServer);
  if (!dataRaw) throw Error("VMware Server is not configured");

  /* Parse Data */
  const data = jsonParse<Server[]>(dataRaw);
  if (!data) {
    /* Throw Error and purge LocalStorage if data are corrupted */
    await LocalStorage.removeItem(LocalStorageItemServer);
    throw Error("Corrupted data on LocalStorage Item 'server'");
  }

  /* Filter Data */
  const newData = data.filter((value) => value.name !== config.name);

  /* Push new config and save */
  newData.push(config);
  await LocalStorage.setItem(LocalStorageItemServer, JSON.stringify(newData));
}

/* Get VM Array from Cache */
export function GetCachedVMs(serverName: string): Vm[] | undefined {
  const cacheId = `vm_${serverName}_vms`;

  /* Get Data from Cache */
  const dataRaw = raycastCache.get(cacheId);
  if (!dataRaw) return undefined;

  /* Parse Data */
  const data = jsonParse<Vm[]>(dataRaw);
  if (!data) {
    console.warn(`Corrupted Cache Data on '${cacheId}', wiping cache`);
    raycastCache.remove(cacheId);
  }

  return data;
}

/* Get NetworkSummary from Cache */
export function GetCachedNetworkSummary(serverName: string): NetworkSummary[] | undefined {
  const cacheId = `vm_${serverName}_networks`;

  /* Get Data from Cache */
  const dataRaw = raycastCache.get(cacheId);
  if (!dataRaw) return undefined;

  /* Parse Data */
  const data = jsonParse<NetworkSummary[]>(dataRaw);
  if (!data) {
    console.warn(`Corrupted Cache Data on '${cacheId}', wiping cache`);
    raycastCache.remove(cacheId);
  }

  return data;
}

/* Get StoragePolicySummary from Cache */
export function GetCachedStoragePolicies(serverName: string): StoragePoliciesSummary[] | undefined {
  const cacheId = `vm_${serverName}_storage_policies`;

  /* Get Data from Cache */
  const dataRaw = raycastCache.get(cacheId);
  if (!dataRaw) return undefined;

  /* Parse Data */
  const data = jsonParse<StoragePoliciesSummary[]>(dataRaw);
  if (!data) {
    console.warn(`Corrupted Cache Data on '${cacheId}', wiping cache`);
    raycastCache.remove(cacheId);
  }

  return data;
}

/* Get Network from Cache */
export function GetCachedNetworks(serverName: string): Network[] | undefined {
  const cacheId = `network_${serverName}`;

  /* Get Data from Cache */
  const dataRaw = raycastCache.get(cacheId);
  if (!dataRaw) return undefined;

  /* Parse Data */
  const data = jsonParse<Network[]>(dataRaw);
  if (!data) {
    console.warn(`Corrupted Cache Data on '${cacheId}', wiping cache`);
    raycastCache.remove(cacheId);
  }

  return data;
}

/* Get Host from Cache */
export function GetCachedHosts(serverName: string): Host[] | undefined {
  const cacheId = `host_${serverName}`;

  /* Get Data from Cache */
  const dataRaw = raycastCache.get(cacheId);
  if (!dataRaw) return undefined;

  /* Parse Data */
  const data = jsonParse<Host[]>(dataRaw);
  if (!data) {
    console.warn(`Corrupted Cache Data on '${cacheId}', wiping cache`);
    raycastCache.remove(cacheId);
  }

  return data;
}

/* Get DataStore from Cache */
export function GetCachedDatastores(serverName: string): Datastore[] | undefined {
  const cacheId = `datastore_${serverName}`;

  /* Get Data from Cache */
  const dataRaw = raycastCache.get(cacheId);
  if (!dataRaw) return undefined;

  /* Parse Data */
  const data = jsonParse<Datastore[]>(dataRaw);
  if (!data) {
    console.warn(`Corrupted Cache Data on '${cacheId}', wiping cache`);
    raycastCache.remove(cacheId);
  }

  return data;
}

/**
 * Get Saved Server from LocalStorage
 * @returns {Promise<Map<string, vCenter[] | undefined>>} Return Saved Server if present otherwise undefined value.
 */
export async function GetServer(): Promise<Map<string, vCenter> | undefined> {
  const json = await LocalStorage.getItem("server");
  if (json) {
    const o: Map<string, vCenter> = new Map();
    const s: Server[] = JSON.parse(json as string);
    s.forEach((d) => {
      o.set(d.name, new vCenter(d.server, d.username, d.password));
    });
    return o;
  } else {
    return undefined;
  }
}
