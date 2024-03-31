import { LocalStorage } from "@raycast/api";
import { Digest, Source } from "../types";
import dayjs from "dayjs";
import { fixSurrogatePairs } from "../utils/util";

export const getSources = async (): Promise<Source[]> => {
  const itemsJson = await LocalStorage.getItem<string>("sources");
  return itemsJson ? JSON.parse(itemsJson) : [];
};

export const saveSources = async (items: Source[]) => {
  await LocalStorage.setItem("sources", JSON.stringify(items));
};

export const addSource = async (item: Omit<Source, "id">): Promise<void> => {
  const items = await getSources();
  items.push({ id: `${Date.now()}`, ...item });
  await saveSources(items);
};

export const getDigests = async (): Promise<Digest[]> => {
  const itemsJson = await LocalStorage.getItem<string>("digests");
  return itemsJson ? JSON.parse(fixSurrogatePairs(itemsJson)) : [];
};

export const saveDigests = async (digests: Digest[]) => {
  return await LocalStorage.setItem("digests", JSON.stringify(digests));
};

// export const addDigest = async (digest: Omit<Digest, "id" | "createAt">): Promise<void> => {
//   const digests = await getDigests();
//   const now = Date.now();
//   digests.push({ ...digest, createAt: Date.now(), id: now.toString() });
//   saveDigests(digests);
// };

// export const updateDigest = async (digest: Partial<Digest> & { id: string }): Promise<void> => {
//   const digests = await getDigests();
//   const index = digests.findIndex((item) => item.id === digest.id);
//   if (index > -1) {
//     digests[index] = { ...digests[index], ...digest };
//     saveDigests(digests);
//   }
// };

export const getTodaysDigest = async () => {
  const digests = await getDigests();
  const target = digests.find((item) => {
    return dayjs(item.createAt).isSame(dayjs(), "date");
  });

  return target ?? null;
};

export const checkTodaysDigestExist = async (type?: "manual" | "auto"): Promise<boolean> => {
  const target = await getTodaysDigest();

  return type ? target?.type === type : !!target;
};

export const addOrUpdateDigest = async (digest: Partial<Digest>): Promise<Digest> => {
  const digests = await getDigests();
  const index = digests.findIndex((item) => item.title === digest.title);

  let target: Digest;
  const now = Date.now();
  const content = fixSurrogatePairs(digest.content ?? "");

  // 存在则更新，不存在则添加
  if (index > -1) {
    digests[index] = { ...digests[index], ...digest, content, createAt: digest.createAt ?? now };
    target = digests[index];
  } else {
    target = { ...digest, content, createAt: digest.createAt ?? now, id: now.toString() } as Digest;
    digests.push(target);
  }
  await saveDigests(digests);
  return target;
};

export const saveLastNotifyTime = async (time: number) => {
  await LocalStorage.setItem("lastNotifyTime", time);
};

export const clearLastNotifyTime = async () => {
  await saveLastNotifyTime(0);
};

export const getLastNotifyTime = async (): Promise<number | undefined> => {
  const time = await LocalStorage.getItem<number>("lastNotifyTime");
  return time;
};

export async function saveWriteFreelyAccessToken(token: string) {
  await LocalStorage.setItem("writefreelyAccessToken", token);
}

export async function getWriteFreelyAccessToken() {
  const token = await LocalStorage.getItem<string>("writefreelyAccessToken");
  return token;
}

export async function saveInterestsSelected(selected: boolean) {
  await LocalStorage.setItem("interestsSelected", selected);
}

// 发现打印出来是1，而非true
export async function getInterestsSelected() {
  return (await LocalStorage.getItem<boolean>("interestsSelected")) || false;
}

export async function saveInterest(interest: string) {
  await LocalStorage.setItem("interest", interest);
}

export async function getInterest() {
  return await LocalStorage.getItem<string>("interest");
}

export async function saveComeFrom(from: string) {
  await LocalStorage.setItem("comeFrom", from);
}

export async function getComeFrom() {
  return await LocalStorage.getItem<string>("comeFrom");
}

// 这个实际含义是查看摘要的次数。这样可以避免用户有时候自动生成，没有查看，则无需计数。
export async function getDigestGenerationCount() {
  return (await LocalStorage.getItem<number>("digestGenerationCount")) ?? 0;
}

// 这个实际含义是查看摘要的次数。这样可以避免用户有时候自动生成，没有查看，则无需计数。
export async function addDigestGenerationCount() {
  const count = (await getDigestGenerationCount()) ?? 0;
  await LocalStorage.setItem("digestGenerationCount", count + 1);
}
