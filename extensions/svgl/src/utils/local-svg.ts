import { LocalStorage } from "@raycast/api";

export const getPinnedSvgIds = async () => {
  const pinnedSvgIdsStr = await LocalStorage.getItem<string>("pinnedSvgIds");
  return pinnedSvgIdsStr ? JSON.parse(pinnedSvgIdsStr) : [];
};

export const pinSvgToLocal = async (id: number) => {
  const pinnedSvgIdsStr = await LocalStorage.getItem<string>("pinnedSvgIds");
  const pinnedSvgIds = pinnedSvgIdsStr ? JSON.parse(pinnedSvgIdsStr) : [];
  if (pinnedSvgIds.includes(id)) {
    return;
  }

  pinnedSvgIds.unshift(id);
  await LocalStorage.setItem("pinnedSvgIds", JSON.stringify(pinnedSvgIds));
};

export const unPinSvgFromLocal = async (id: number) => {
  const pinnedSvgIdsStr = await LocalStorage.getItem<string>("pinnedSvgIds");
  const pinnedSvgIds = pinnedSvgIdsStr ? JSON.parse(pinnedSvgIdsStr) : [];
  if (!pinnedSvgIds.includes(id)) {
    return;
  }

  await LocalStorage.setItem(
    "pinnedSvgIds",
    JSON.stringify(pinnedSvgIds.filter((pinnedId: number) => pinnedId !== id)),
  );
};

export const syncLocalPinnedSvgIds = async (pinnedSvgIds: number[]) => {
  await LocalStorage.setItem("pinnedSvgIds", JSON.stringify(pinnedSvgIds));
};

export const getRecentSvgIds = async () => {
  const recentSvgIdsStr = await LocalStorage.getItem<string>("recentSvgIds");
  return recentSvgIdsStr ? JSON.parse(recentSvgIdsStr) : [];
};

export const addRecentSvgIdToLocal = async (id: number) => {
  const recentSvgIdsStr = await LocalStorage.getItem<string>("recentSvgIds");
  const recentSvgIds = recentSvgIdsStr ? JSON.parse(recentSvgIdsStr) : [];

  const newRecentSvgIds = recentSvgIds.filter((recentId: number) => recentId !== id);
  newRecentSvgIds.unshift(id);

  await LocalStorage.setItem("recentSvgIds", JSON.stringify(newRecentSvgIds));
};
