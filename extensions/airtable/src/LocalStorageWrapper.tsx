import { Cache, LocalStorage } from "@raycast/api";

const cache = new Cache();

const NUMBER_OF_CLICKS_BY_BASE_ID = "numberOfClicksByBaseId";

export type NumberOfClicksByBase = { [baseId: string]: number };

export async function getNumberOfClicksByBaseIdAsync(): Promise<NumberOfClicksByBase> {
  let numberOfClicksByBaseIdString: string | undefined;

  // Since the cache is guaranteed to be either up-to-date OR ejected from cache, we can
  // pull from the cache first for speed.
  if (cache.has(NUMBER_OF_CLICKS_BY_BASE_ID)) {
    numberOfClicksByBaseIdString = cache.get(NUMBER_OF_CLICKS_BY_BASE_ID);
  } else {
    numberOfClicksByBaseIdString = await LocalStorage.getItem(NUMBER_OF_CLICKS_BY_BASE_ID);
  }

  return typeof numberOfClicksByBaseIdString === "string" ? JSON.parse(numberOfClicksByBaseIdString) : {};
}

export async function incrementNumberOfClicksOnDetailForBaseAsync(baseId: string) {
  const numberOfClicksByBaseId = await getNumberOfClicksByBaseIdAsync();
  numberOfClicksByBaseId[baseId] = (numberOfClicksByBaseId[baseId] ?? 0) + 1;
  const stringifiedNumberOfClicksByBaseId = JSON.stringify(numberOfClicksByBaseId);

  cache.set(NUMBER_OF_CLICKS_BY_BASE_ID, stringifiedNumberOfClicksByBaseId);
  await LocalStorage.setItem(NUMBER_OF_CLICKS_BY_BASE_ID, stringifiedNumberOfClicksByBaseId);
}
