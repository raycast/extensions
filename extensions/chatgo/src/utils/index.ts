import { Chat, Message } from "../type";
import fs from "fs";
import afs from "fs/promises";
import os from "os";
import util from "util";
import { pipeline } from "stream";
import fetch from "cross-fetch";
import { getPreferenceValues } from "@raycast/api";

const streamPipeline = util.promisify(pipeline);

export function chatTransfomer(chat: Chat[], prompt?: string): Message[] {
  const messages: Message[] = prompt ? [{ role: "system", content: prompt }] : [];
  chat.forEach(({ question, answer }) => {
    messages.push({ role: "user", content: question });
    messages.push({
      role: "assistant",
      content: answer,
    });
  });
  return messages;
}

export async function downloadFile(url: string, params: { localFilepath: string }): Promise<void> {
  if (fs.existsSync(params.localFilepath)) {
    return;
  }
  const response = await fetch(url, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`unexpected response ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Bad response body");
  }
  await streamPipeline(response.body as any, fs.createWriteStream(params.localFilepath));
}

export function getDownloadFolder(): string {
  const d = "~/Downloads";
  const prefs = getPreferenceValues();
  const folder = (prefs.downloadfolder as string) || d;
  return resolveFilepath(folder);
}

export function resolveFilepath(filename: string): string {
  if (filename.startsWith("~")) {
    const hd = os.homedir();
    return hd + filename.substring(1);
  }
  return filename;
}

export async function fileToBase64Image(filename: string): Promise<string> {
  const buff = await afs.readFile(filename);
  const base64data = buff.toString("base64");
  return `data:image/jpeg;base64,${base64data}`;
}

export function capitalizeFirstLetter(name: string): string {
  return name.replace(/^./, name[0].toUpperCase());
}

export function splitTagString(text: string): string[] {
  return text.split(",").map((t) => t.trim());
}
