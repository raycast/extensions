// This is the Storage interface, which combines LocalStorage with more persistent file system storage.
// If the persistent storage preference is enabled, we also keep the two versions in sync,
// but the sync process happens only periodically so the file storage should not be relied upon for immediate consistency.
// Note that persistent storage is not always the best option as file I/O is relatively expensive.
// Thus, only use it when you really need to persist data across sessions. Otherwise, use local storage.

import { LocalStorage } from "@raycast/api";
import { Preferences } from "./preferences.js";

import { getSupportPath } from "../helpers/helper.js";
import fs from "fs";

const not_found = (x) => x === undefined || x === null;
const found = (x) => !not_found(x);

export const Storage = {
  // whether to enable persistent/combined storage
  persistent: Preferences["persistentStorage"] || false,

  /// Local storage functions - these provide quicker access that is not critical to persist

  // check if item exists in local storage
  localStorage_has: async (key) => {
    return found(await LocalStorage.getItem(key));
  },

  // write to local storage
  // value is stored as-is, it is the user's responsibility to serialize it if needed
  localStorage_write: async (key, value) => {
    await LocalStorage.setItem(key, value);
  },

  // read from local storage
  // if a default value is provided and key is not found, write the default value to local storage
  // value is returned as-is, it is the user's responsibility to deserialize it if needed
  localStorage_read: async (key, default_value = undefined) => {
    const retrieved = await LocalStorage.getItem(key);
    if (not_found(retrieved) && default_value !== undefined) {
      await Storage.localStorage_write(key, default_value);
      return default_value;
    }
    return retrieved;
  },

  // delete from local storage
  localStorage_delete: async (key) => {
    await LocalStorage.removeItem(key);
  },

  // list all items in local storage
  localStorage_list: async () => {
    return await LocalStorage.allItems();
  },

  /// For file storage we use a dedicated directory within the support path.
  /// As a speedup, we store each key-value pair in a separate file.

  // get file storage path for a key
  // it is the user's responsibility to ensure that the key is a valid file name
  fileStoragePath: (key) => {
    return `${getSupportPath()}/storage/${key}.txt`;
  },

  // check if item exists in file storage
  fileStorage_has: async (key) => {
    return fs.existsSync(Storage.fileStoragePath(key));
  },

  // write to file storage
  fileStorage_write: async (key, value) => {
    // ensure storage directory exists
    const dir = `${getSupportPath()}/storage`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const path = Storage.fileStoragePath(key);
    fs.writeFileSync(path, value);
  },

  // read from file storage
  // if a default value is provided and key is not found, write the default value to file storage
  fileStorage_read: async (key, default_value = undefined) => {
    const path = Storage.fileStoragePath(key);
    if (!fs.existsSync(path)) {
      if (default_value === undefined) return undefined;
      await Storage.fileStorage_write(key, default_value);
      return default_value;
    }
    return fs.readFileSync(path, "utf8");
  },

  // delete from file storage
  fileStorage_delete: async (key) => {
    const path = Storage.fileStoragePath(key);
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  },

  /// Sync functions
  /// We carry out a sync process periodically when either read or write is called

  syncInterval: 5 * 60 * 1000, // interval for syncing local and file storage (in ms)

  add_to_sync_cache: async (key) => {
    // important! the keys syncCache and lastSync should ONLY EVER be put in local storage
    // or else it will likely cause infinite recursion in the combined read function.
    // anyway it's useless to put them in file storage as they are only used for syncing
    let syncCache = JSON.parse(await Storage.localStorage_read("syncCache", "{}"));
    syncCache[key] = true;
    await Storage.localStorage_write("syncCache", JSON.stringify(syncCache));
  },

  run_sync: async () => {
    let lastSync = await Storage.localStorage_read("lastSync", 0);
    if (Date.now() - lastSync < Storage.syncInterval) return;

    console.log("Storage API: running sync process");
    let syncCache = JSON.parse(await Storage.localStorage_read("syncCache", "{}"));
    for (const key of Object.keys(syncCache)) {
      const local = await Storage.localStorage_read(key);
      if (local) {
        await Storage.fileStorage_write(key, local);
      }
    }

    // clear sync cache, reset last sync time
    await Storage.localStorage_write("syncCache", "{}");
    await Storage.localStorage_write("lastSync", Date.now());
  },

  // combined write function
  // first write to local storage function only, and then add key to sync cache to add to file storage later
  write: async (key, value) => {
    if (typeof value !== "string") {
      // value must be a string. To avoid crashes we serialize it, but log a warning.
      value = JSON.stringify(value);
      console.log(`Storage API: Warning: value for key ${key} is not a string`);
    }

    await Storage.localStorage_write(key, value);
    if (Storage.persistent) {
      await Storage.add_to_sync_cache(key);
      await Storage.run_sync();
    }
  },

  // combined read function - read from local storage, fallback to file storage.
  // also writes the default value to local storage if it is provided and key is not found
  read: async (key, default_value = undefined) => {
    let value;
    if (await Storage.localStorage_has(key)) {
      value = await Storage.localStorage_read(key);
      // note how we only sync here, as it only makes sense when we have a value in local storage
      if (Storage.persistent) {
        await Storage.add_to_sync_cache(key);
        await Storage.run_sync();
      }
    } else if (Storage.persistent && (await Storage.fileStorage_has(key))) {
      console.log(`Reading key: ${key} from file storage`);
      value = await Storage.fileStorage_read(key);
      // write to local storage
      await Storage.localStorage_write(key, value);
    } else {
      console.log(`Key: ${key} not found, returning default value`);
      value = default_value;
      // write default key to storage
      if (value !== undefined) await Storage.write(key, value);
    }
    return value;
  },

  // combined delete function - delete from both local and file storage
  delete: async (key) => {
    await Storage.localStorage_delete(key);
    await Storage.fileStorage_delete(key);
  },
};
