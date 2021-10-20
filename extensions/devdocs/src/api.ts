import { showToast, ToastStyle } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import { dirname, resolve } from "path/posix";
import { Doc, Entry, Index } from "./types";

export const DEVDOCS_BASE_URL = "https://devdocs.io";

export class IndexCache {
  _path: string;

  constructor(path: string) {
    this._path = path;
  }

  async fetch(): Promise<Doc[]>;
  async fetch(doc: Doc): Promise<Entry[]>;
  async fetch(doc?: Doc): Promise<Doc[] | Entry[]>;
  async fetch(doc?: Doc): Promise<Doc[] | Entry[]> {
    if (doc !== undefined) return await fetchDoc(doc.slug);
    return await fetchDocIndex();
  }

  async get(): Promise<Doc[]>;
  async get(doc: Doc): Promise<Entry[]>;
  async get(doc?: Doc): Promise<Doc[] | Entry[]>;
  async get(doc?: Doc): Promise<Entry[] | Doc[]> {
    if (!existsSync(this.path(doc))) {
      mkdirSync(dirname(this.path(doc)), { recursive: true });
      const items = await this.fetch(doc);
      writeFileSync(this.path(doc), JSON.stringify(items));
    }
    return JSON.parse(readFileSync(this.path(doc)).toString());
  }

  clear(doc?: Doc): void {
    const path = this.path(doc);
    if (existsSync(this.path(doc))) rmSync(path);
  }

  async refresh(): Promise<Doc[]>;
  async refresh(doc: Doc): Promise<Entry[]>;
  async refresh(doc?: Doc): Promise<Doc[] | Entry[]> {
    this.clear(doc);
    return await this.get(doc);
  }

  path(doc?: Doc): string {
    return resolve(this._path, `${doc ? doc.slug : "docs"}.json`);
  }
}

export async function fetchDocIndex(): Promise<Doc[]> {
  try {
    const response = await fetch(`${DEVDOCS_BASE_URL}/docs/docs.json`);
    const json = await response.json();
    return json as Doc[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load doc. Please check your connexion.");
    return Promise.resolve([]);
  }
}

export async function fetchDoc(slug: string): Promise<Entry[]> {
  try {
    const response = await fetch(`${DEVDOCS_BASE_URL}/docs/${slug}/index.json`);
    const json = await response.json();
    return (json as Index).entries;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load doc. Please check your connexion.");
    return Promise.resolve([]);
  }
}
