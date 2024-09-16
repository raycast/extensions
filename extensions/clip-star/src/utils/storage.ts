/* eslint-disable @typescript-eslint/no-explicit-any */
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Clip } from "../types";
import { Client } from "@notionhq/client";

const STORAGE_KEY = "clips";

interface Preferences {
  notionToken?: string;
  databaseId?: string;
  tableKey?: string;
}

const { notionToken, databaseId, tableKey } = getPreferenceValues<Preferences>();
const [title, url, tag, createdAt, updatedAt] = tableKey!.split(",");

const notion = notionToken ? new Client({ auth: notionToken }) : null;

async function getClipsFromNotion(): Promise<Clip[]> {
  if (!notion || !databaseId) return [];
  try {
    const response: any = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: createdAt, direction: "descending" }],
    });
    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties[title].title[0]?.plain_text || "",
      url: page.properties[url].url || "",
      tags: page.properties[tag].multi_select.map((tag: any) => tag.name),
      createdAt: page.properties[createdAt].date.start,
      updatedAt: page.properties[updatedAt].date.start,
      coverImage: page.cover.external.url,
    }));
  } catch (error) {
    console.error("从 Notion 获取数据失败:", error);
    return [];
  }
}

async function saveClipToNotion(clip: Clip): Promise<void> {
  if (!notion || !databaseId) return;

  try {
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        [title]: { title: [{ text: { content: clip.title } }] },
        [url]: { url: clip.url },
        [tag]: { multi_select: clip.tags.map((tag) => ({ name: tag })) },
        [createdAt]: { date: { start: clip.createdAt } },
        [updatedAt]: { date: { start: clip.updatedAt } },
      },
      cover: { external: { url: clip.coverImage! } },
    });
  } catch (error) {
    console.error("保存到 Notion 失败:", error);
  }
}

export async function getClips(): Promise<Clip[]> {
  if (notionToken && databaseId) {
    return getClipsFromNotion();
  } else {
    const data = await LocalStorage.getItem<string>(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
}

export async function addClip(clip: Clip) {
  if (notionToken && databaseId) {
    await saveClipToNotion(clip);
  } else {
    const clips = await getClips();
    clips.unshift(clip);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  }
}

export async function updateClip(updatedClip: Clip) {
  if (notionToken && databaseId) {
    try {
      await notion?.pages.update({
        page_id: updatedClip.id,
        properties: {
          [title]: { title: [{ text: { content: updatedClip.title } }] },
          [url]: { url: updatedClip.url },
          [tag]: { multi_select: updatedClip.tags.map((tag) => ({ name: tag })) },
          [updatedAt]: { date: { start: updatedClip.updatedAt } },
        },
      });
    } catch (error) {
      console.error("更新 Notion 页面失败:", error);
    }
  }

  const clips = await getClips();
  const updatedClips = clips.map((clip) => (clip.id === updatedClip.id ? updatedClip : clip));

  if (!notionToken || !databaseId) {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClips));
  }

  return updatedClips;
}

export async function deleteClip(id: string) {
  if (notionToken && databaseId) {
    try {
      await notion?.pages.update({
        page_id: id,
        archived: true,
      });
    } catch (error) {
      console.error("删除 Notion 页面失败:", error);
    }
  }

  const clips = await getClips();
  const updatedClips = clips.filter((clip) => clip.id !== id);

  if (!notionToken || !databaseId) {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClips));
  }

  return updatedClips;
}
