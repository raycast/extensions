import { LocalStorage } from "@raycast/api";
import type * as Types from "@ui/types";

type ErrorCodeLocalStorageRaycast =
  | "LOCAL_STORAGE_SET_ITEM"
  | "LOCAL_STORAGE_REMOVE_ITEM"
  | "LOCAL_STORAGE_GET_ITEM"
  | "LOCAL_STORAGE_GET_ITEM_JSON_SYNTAX";

type LocalStorageValueTypes = object | string | number | boolean;

/**
 * LocalStorage Error.
 *
 * Extend `Error` with:
 * - error message
 * - error code
 * - original error
 *
 * @example
 * ``ts
 * throw new LocalStorageRaycastError(
 *  "Error message",
 *  "LOCAL_STORAGE_SET_ITEM",
 *  { cause: error }
 * });
 * ``
 */
export class LocalStorageRaycastError extends Error {
  /**
   * Init new instance of LocalStorageRaycastError
   *
   * @param message - error message
   * @param code - error code
   * @param options.cause - original error
   */
  constructor(
    message: string,
    readonly code: ErrorCodeLocalStorageRaycast,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LocalStorageRaycastError";
  }
}

/**
 * LocalStorage Generic Class for handle Raycast LocalStorage
 */
class LocalStorageRaycast {
  /**
   * Init new instance of LocalStorageRaycast
   */
  constructor() {}

  /**
   * Convert `value` to types accepted from LocalStorage.
   *
   * @param value - value to convert
   *
   * @returns value converted to type `LocalStorage.Value`
   */
  #convertValue(value: LocalStorageValueTypes): LocalStorage.Value {
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") return value as LocalStorage.Value;
    return JSON.stringify(value);
  }

  /**
   * Set Item on LocalStorage.
   *
   * @param key - LocalStorage Item Key.
   * @param value - value to save.
   */
  async setItem(key: string, value: LocalStorageValueTypes): Promise<void> {
    const v = this.#convertValue(value);

    try {
      await LocalStorage.setItem(key, v);
    } catch (e) {
      console.error(`Class: LocalStorageRaycast, Fn: setItem.`, { key, e });
      const error = e instanceof Error ? e : new Error("LocalStorageError", { cause: e });
      throw new LocalStorageRaycastError(`Error saving item on LocalStorage, key: '${key}'`, "LOCAL_STORAGE_SET_ITEM", {
        cause: error,
      });
    }
  }

  /**
   * Remove Item from LocalStorage.
   *
   * @param key - LocalStorage Item Key.
   */
  async removeItem(key: string): Promise<void> {
    try {
      await LocalStorage.removeItem(key);
    } catch (e) {
      console.error(`Class: LocalStorageRaycast, Fn: removeItem.`, { key, e });
      const error = e instanceof Error ? e : new Error("LocalStorageError", { cause: e });
      throw new LocalStorageRaycastError(
        `Error removing item on LocalStorage, key: '${key}'`,
        "LOCAL_STORAGE_REMOVE_ITEM",
        { cause: error },
      );
    }
  }

  /**
   * Get Object Item from LocalStorage.
   *
   * @param key - LocalStorage Item Key.
   *
   * @returns JSON parsed `T` value.
   */
  async getItemObject<T extends object>(key: string): Promise<T | undefined> {
    try {
      const item = await LocalStorage.getItem<string>(key);
      console.debug(`Class: LocalStorageRaycast, Fn: getItemObject.`, { key, item });
      if (!item) return undefined;

      const json: T = JSON.parse(item);
      return json;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("LocalStorageError", { cause: e });

      /**
       * Handle JSON Syntax Error.
       *
       * Remove malformed JSON from LocalStorage.
       */
      if (error instanceof SyntaxError) {
        console.debug(`Class: LocalStorageRaycast, Fn: getItemObject. Unexpected json.`, { key, error });

        /* Remove Item from LocalStorage */
        try {
          await this.removeItem(key);
          console.debug(`Class: LocalStorageRaycast, Fn: getItemObject. Removed unexpected json.`, { key });
        } catch (e) {
          const error = e instanceof Error ? e : new Error("LocalStorageError", { cause: e });
          throw new LocalStorageRaycastError(
            `Unexpected JSON stored on LocalStorage. Removal from LocalStorage failed, key: '${key}'`,
            "LOCAL_STORAGE_GET_ITEM_JSON_SYNTAX",
            { cause: error },
          );
        }

        throw new LocalStorageRaycastError(
          `Unexpected JSON stored on LocalStorage. Removed from LocalStorage, key: '${key}'`,
          "LOCAL_STORAGE_GET_ITEM_JSON_SYNTAX",
          { cause: error },
        );
      }

      throw new LocalStorageRaycastError(
        `Error getting item from LocalStorage, key: '${key}'`,
        "LOCAL_STORAGE_GET_ITEM",
        { cause: error },
      );
    }
  }

  /**
   * Get Value Item from LocalStorage.
   *
   * @param key - LocalStorage Item Key.
   *
   * @returns Item stored in LocalStorage.
   */
  async getItem<T extends LocalStorage.Value>(key: string): Promise<T | undefined> {
    try {
      const item = await LocalStorage.getItem<T>(key);
      console.debug(`Class: LocalStorageRaycast, Fn: getItem.`, { key, item });
      return item;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("LocalStorageError", { cause: e });
      throw new LocalStorageRaycastError(
        `Error getting item from LocalStorage, key: '${key}'`,
        "LOCAL_STORAGE_GET_ITEM",
        { cause: error },
      );
    }
  }

  /**
   * Edit specific value in Item Array on LocalStorage.
   *
   * @param key - LocalStorage Item Key.
   * @param value - Value to edit (fnFindIndex and compareFn must be defined) or add.
   * @param fnFindIndex - Function that return the index where `value` is located.
   * @param compareFn - compareFn for sort the array.
   *
   * @returns `T[]` saved on LocalStorage.
   */
  async editItemArray<T extends LocalStorageValueTypes>(
    key: string,
    value: T,
    fnFindIndex?: (array: T[], value: T) => number,
    compareFn?: (a: T, b: T) => number,
  ): Promise<T[]> {
    const save = async (value: T[]): Promise<T[]> => {
      await this.setItem(key, value);
      console.debug(`Class: LocalStorageRaycast, Fn: editItemArray. Value edited.`, { key });
      return value;
    };

    const items = await this.getItemObject<T[]>(key);

    /* If Items is undefined. Write `[value]` on LocalStorage */
    if (!items) {
      return await save([value]);
    }

    /* If `fnFindIndex` is defined find index and replace `value`*/
    if (fnFindIndex) {
      const index = fnFindIndex(items, value);
      /* If `value` exist, edit on Items, sort and write in LocalStorage */
      if (index > -1) {
        items[index] = value;
        if (compareFn) items.sort(compareFn);
        return await save(items);
      }
    }

    /* If `value` is new, append on Items, order array and  write on LocalStorage */
    items.push(value);
    items.sort(compareFn);
    return await save(items);
  }

  /**
   * Remove specific value in Item Array on LocalStorage.
   *
   * @param key - LocalStorage Item Key.
   * @param value - Value to remove.
   * @param fnFindIndex - Function that return the index where `value` is located.
   *
   * @returns `T[]` saved on LocalStorage.
   */
  async removeItemArray<T extends LocalStorageValueTypes>(
    key: string,
    value: T,
    fnFindIndex: (array: T[], value: T) => number,
  ): Promise<T[] | undefined> {
    const save = async (value: T[]): Promise<T[]> => {
      await this.setItem(key, value);
      console.debug(`Class: LocalStorageRaycast, Fn: removeItemArray. Value removed.`, { key });
      return value;
    };

    const items = await this.getItemObject<T[]>(key);

    /* If Items is undefined return the value */
    if (!items) {
      console.warn(`Class: LocalStorageRaycast, Fn: removeItemArray. Trying to remove value from an undefined item.`, {
        key,
      });
      return;
    }

    /* Find index and replace remove`value` */
    const index = fnFindIndex(items, value);
    /* If `value` exist, remove and write in LocalStorage */
    if (index > -1) {
      items.splice(index, 1);
      return await save(items);
    }
    console.warn(`Class: LocalStorageRaycast, Fn: removeItemArray. Trying to remove value not existing.`, { key });
  }
}

/**
 * LocalStorage Class for handling Raycast LocalStorage for GLPI extention.
 *
 * @example
 * ``ts
 * const localStorage = new LocalStorageRaycastGlpi();
 * ``
 */
class LocalStorageRaycastGlpi extends LocalStorageRaycast {
  /**
   * LocalStorage key where GLPI Server Config is stored
   */
  readonly #keyGlpiServerConfig: string = "glpi_server_config";

  /**
   * LocalStorage key where selected Glpi Server config is stored
   */
  readonly #keySelectedGlpiServer: string = "glpi_server_selected";

  /**
   * Init new instance of LocalStorageRaycastGlpi
   */
  constructor() {
    super();
  }

  /**
   * Set `GlpiServer[]` Item on LocalStorage.
   *
   * @param value - Glpi Server Config.
   *
   * WARNING: this function write on top of current value.
   */
  async setGlpiServerConfig(value: Types.GlpiServer[]): Promise<void> {
    await this.setItem(this.#keyGlpiServerConfig, value);
  }

  /**
   * Get `GlpiServer[]` Item from LocalStorage.
   */
  async getGlpiServerConfig(): Promise<Types.GlpiServer[] | undefined> {
    return await this.getItemObject<Types.GlpiServer[]>(this.#keyGlpiServerConfig);
  }

  /**
   * Remove `GlpiServer[]` Item from LocalStorage.
   */
  async deleteGlpiServerConfig(): Promise<void> {
    return await this.removeItem(this.#keyGlpiServerConfig);
  }

  /**
   * Find index of `GlpiServer[]` where uuid match.
   *
   * @param array - Array where to find index.
   * @param value - Value to find.
   */
  #findIndexGlpiServerConfig(array: Types.GlpiServer[], value: Types.GlpiServer): number {
    return array.findIndex((v) => v.uuid === value.uuid);
  }

  /**
   * compareFn used for order `GlpiServer[]` by name.
   *
   * @param a - The first element for comparison.
   * @param b - The second element for comparison.
   */
  #compareFnGlpiServerConfig(a: Types.GlpiServer, b: Types.GlpiServer): number {
    return a.name.localeCompare(b.name);
  }

  /**
   * Edit `GlpiServer[]` Item in LocalStorage.
   *
   * @param value - new value. If exist modify the existing value.
   *
   * @returns `GlpiServer[]` with new value.
   */
  async editGlpiServerConfig(value: Types.GlpiServer): Promise<Types.GlpiServer[]> {
    /* Move LocalStorage Token to new key if endpoint changed */
    const config = await this.getGlpiServerConfig();
    if (config) {
      const index = this.#findIndexGlpiServerConfig(config, value);
      const oldValue = index > -1 ? config.at(index) : undefined;

      /* Preserve token if endpoint changed */
      if (oldValue && oldValue.endpoint !== value.endpoint) {
        const oldKey = `token:${oldValue.endpoint}`;
        const newKey = `token:${value.endpoint}`;

        const token = await this.getItem(oldKey);
        await this.removeItem(oldKey);
        if (token) await this.setItem(newKey, token);
      }
    }

    return await this.editItemArray(
      this.#keyGlpiServerConfig,
      value,
      this.#findIndexGlpiServerConfig,
      this.#compareFnGlpiServerConfig,
    );
  }

  /**
   * Remove `value` Glpi Server from LocalStorage and save token.
   *
   * @param value - value to remove.
   *
   * @returns `GlpiServer[]` with new value.
   */
  async removeGlpiServerConfig(value: Types.GlpiServer): Promise<Types.GlpiServer[] | undefined> {
    /* Remove saved token */
    await this.removeItem(`token:${value.endpoint}`);

    /* Remove `value` from array */
    return await this.removeItemArray(this.#keyGlpiServerConfig, value, this.#findIndexGlpiServerConfig);
  }

  /**
   * Set Selected UUID Glpi Server.
   *
   * @param value - Selected Glpi Server UUID.
   *
   */
  async setSelectedGlpiServer(value: string): Promise<void> {
    const config = await this.getGlpiServerConfig();

    /* Glpi Server Config must be defined */
    if (!config)
      throw new LocalStorageRaycastError(
        `Glpi Server Config is not defined. Can't set selected glpi server.`,
        "LOCAL_STORAGE_SET_ITEM",
      );

    /* Selected server must be in Glpi Server Config */
    if (config.findIndex((v) => v.uuid === value) === -1)
      throw new LocalStorageRaycastError(
        `Selected server is not configured. Can't set selected glpi server`,
        "LOCAL_STORAGE_SET_ITEM",
      );

    await this.setItem(this.#keySelectedGlpiServer, value);
  }

  /**
   * Get Selected UUID Glpi Server.
   *
   * - If it isn't set or not in config fallback to first available server.
   *
   * @returns UUID of `undefined` if Glpi Server Config isn't set.
   */
  async getSelectedGlpiServer(): Promise<string | undefined> {
    const config = await this.getGlpiServerConfig();
    const selectedServer = await this.getItem<string>(this.#keySelectedGlpiServer);

    /* Return undefined value if Glpi Server ar not configured */
    if (!config || config.length === 0) {
      console.debug(`Class: LocalStorageRaycastGlpi, Fn: getSelectedGlpiServer. Glpi Server Config is undefined.`);
      return undefined;
    }

    /* If `selectedServer` is undefined or not in config try to fall back to first available Glpi Server */
    if (!selectedServer || config.findIndex((v) => v.uuid === selectedServer) === -1) {
      const firstServer = config.at(0)!.uuid;

      console.debug(
        `Class: LocalStorageRaycastGlpi, Fn: getSelectedGlpiServer. Value is undefined or not in config. Fallback to first available Glpi Server.`,
        { firstServer },
      );

      /* Save in LocalStorage */
      try {
        await this.setSelectedGlpiServer(firstServer);
      } catch (e) {
        console.debug(
          `Class: LocalStorageRaycastGlpi, Fn: getSelectedGlpiServer. Failed to save fallback in LocalStorage`,
          { e },
        );
      }

      return firstServer;
    }

    return selectedServer;
  }
}

export const localStorage = new LocalStorageRaycastGlpi();
