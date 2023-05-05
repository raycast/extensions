import { LocalStorage } from "@raycast/api";

interface ExpirableStorage {
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string) => Promise<void>;
  append: (key: string, value: string) => Promise<void>;
  remove: (key: string, values?: string[]) => Promise<void>;
  removeValuesAndExpiredKeys: (values: string[]) => Promise<void>;
}

type Storable = {
  lastModified: number;
} & Record<string, string | undefined>;

const aDay = 86_400_000;

// WARNING: `retentionPeriodInDays` is expected to be the same across namespaces that may share the same key.
export default function expirableStorage(namespace: string, retentionPeriodInDays: number): ExpirableStorage {
  const delimiter = ",";
  const retentionPeriod = retentionPeriodInDays * aDay;

  const setNewKeyValuePair = async (key: string, value: string) => {
    const data = {
      lastModified: Date.now(),
      [namespace]: value,
    };
    await LocalStorage.setItem(key, JSON.stringify(data));
  };

  const updateNamespaceValue = async (key: string, data: Storable, value: string) => {
    if (value !== "") {
      data[namespace] = value;
    } else {
      /* eslint-disable @typescript-eslint/no-dynamic-delete */
      delete data[namespace];
      if (Object.keys(data).length === 1) {
        await LocalStorage.removeItem(key);
        return;
      }
    }
    data.lastModified = Date.now();
    await LocalStorage.setItem(key, JSON.stringify(data));
  };

  return {
    async get(key) {
      const rawItem = await LocalStorage.getItem<string>(key);
      if (!rawItem) {
        return;
      }

      const { [namespace]: data } = JSON.parse(rawItem) as Storable;
      return data;
    },

    async set(key, value) {
      const rawItem = await LocalStorage.getItem<string>(key);
      if (!rawItem) {
        if (value !== "") {
          await setNewKeyValuePair(key, value);
        }
        return;
      }
      const data = JSON.parse(rawItem) as Storable;
      await updateNamespaceValue(key, data, value);
    },

    async append(key, value) {
      if (value === "") {
        return;
      }

      const rawItem = await LocalStorage.getItem<string>(key);
      if (rawItem === undefined) {
        await setNewKeyValuePair(key, value);
      } else {
        const data = JSON.parse(rawItem) as Storable;
        const csv = data[namespace];
        await updateNamespaceValue(key, data, csv ? csv + delimiter + value : value);
      }
    },

    async remove(key, values) {
      if (!values) {
        await LocalStorage.removeItem(key);
        return;
      }

      if (values.length === 0) {
        return;
      }

      const rawItem = await LocalStorage.getItem<string>(key);
      if (rawItem) {
        const data = JSON.parse(rawItem) as Storable;
        const csv = data[namespace];
        if (csv) {
          const updatedCSV = csv
            .split(delimiter)
            .filter((value) => !values.includes(value))
            .join(delimiter);

          await updateNamespaceValue(key, data, updatedCSV);
        }
      }
    },

    async removeValuesAndExpiredKeys(values) {
      const lastCleanedTimeKey = "last-cleaned-" + namespace;
      const lastRemovedValuesKey = "last-removed-" + namespace + "-values";
      const [lastCleanedTime, lastCleanedValues] = await Promise.all([
        LocalStorage.getItem<number>(lastCleanedTimeKey),
        LocalStorage.getItem<string>(lastRemovedValuesKey).then((csv) => new Set(csv?.split(","))),
      ]);

      // Proceed only if it's been 24 hours or more since the last cleanup (or it's the first time),
      // OR there are new values to remove.
      const now = Date.now();
      const newValuesToRemove = new Set(values.filter((v) => !lastCleanedValues.has(v)));
      if (lastCleanedTime && now - lastCleanedTime < aDay && newValuesToRemove.size === 0) {
        return;
      }

      const items = await LocalStorage.allItems<Record<string, string>>();
      for (const [key, value] of Object.entries(items)) {
        try {
          const data = JSON.parse(value) as Storable;
          const { lastModified, [namespace]: csv } = data;
          // Delete an expired item only if it has data in this namespace since other namespaces may have different
          // retention periods. Still, if multiple namespaces share the same key, data from all namespaces are deleted.
          if (csv === undefined) {
            continue;
          }

          if (now - lastModified > retentionPeriod) {
            await LocalStorage.removeItem(key);
            continue;
          }

          if (newValuesToRemove.size > 0) {
            const values = csv.split(delimiter);
            const initialLength = values.length;
            for (let i = values.length - 1; i >= 0; i--) {
              if (newValuesToRemove.has(values[i])) {
                values.splice(i, 1);
              }
            }
            if (values.length < initialLength) {
              await updateNamespaceValue(key, data, values.join(delimiter));
            }
            continue;
          }
        } catch (error) {
          // Throw only if it's not a SyntaxError caused by executing JSON.parse() on a non-JSON string.
          // "SyntaxError: Unexpected end of JSON input" is expected for non-JSON string values, e.g.,
          // "last-removed-toggl-values".
          if (error instanceof Error && error.name === "SyntaxError" && error.message.endsWith("JSON input")) {
            continue;
          }
          throw error;
        }
      }

      await Promise.all([
        LocalStorage.setItem(lastCleanedTimeKey, now),
        LocalStorage.setItem(lastRemovedValuesKey, values.join(",")),
      ]);
    },
  };
}
