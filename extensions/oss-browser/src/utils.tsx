import { getPreferenceValues } from "@raycast/api";
import OSS from "ali-oss";
import path from "node:path";
import fsSync from "node:fs/promises";
import fs from "node:fs";
import { ACL, CodeExts, ImgExts, MdExt, PlainTextExts } from "./const";
import { homedir } from "os";
import got from "got";

let ossClient: OSS;

export function newOssClient() {
  if (ossClient) {
    return;
  }
  const preferences: IPreferences = getPreferenceValues();
  ossClient = new OSS({
    endpoint: preferences.endPoint,
    cname: preferences.useCustomDomain,
    region: preferences.region,
    accessKeyId: preferences.accessKeyId,
    accessKeySecret: preferences.accessKeySecret,
    bucket: preferences.bucket,
  });
}

export function formatFileSize(size: number): string {
  let sizeStr = "";
  if (size < 1024) {
    sizeStr = `${size}B`;
  } else if (size < 1024 * 1024) {
    sizeStr = `${(size / 1024).toFixed(2)}KB`;
  } else if (size < 1024 * 1024 * 1024) {
    sizeStr = `${(size / 1024 / 1024).toFixed(2)}MB`;
  } else if (size < 1024 * 1024 * 1024 * 1024) {
    sizeStr = `${(size / 1024 / 1024 / 1024).toFixed(2)}GB`;
  }
  return sizeStr;
}

export async function listPage(prefix: string, marker: string): Promise<OSS.ListObjectResult> {
  const preferences: IPreferences = getPreferenceValues();
  let maxKeys = 100;
  if (Number(preferences.pageSize)) {
    const ps = Number(preferences.pageSize);
    maxKeys = ps > 0 && ps <= 1000 ? ps : maxKeys;
  }
  return await ossClient.list({ prefix, delimiter: "/", marker, "max-keys": maxKeys }, {});
}

export async function folderIsEmpty(folder: string): Promise<boolean> {
  const res = await ossClient.list({ prefix: folder, "max-keys": 100 }, {});
  return res.objects.findIndex((obj) => obj.name !== folder) === -1;
}

export async function downloadObject(key: string, size: number) {
  const loc = await getFileDownloadLocation();
  const filePath = `${loc}${path.basename(key)}`;
  const preferences: IPreferences = getPreferenceValues();
  const byStream = size > 1024 * 1024 * preferences.streamThreshold;
  if (byStream) {
    const streamRes = await ossClient.getStream(key);
    const ws = fs.createWriteStream(filePath);
    streamRes.stream.pipe(ws);
  } else {
    await ossClient.get(key, filePath, { timeout: 5000 * preferences.streamThreshold });
  }
  return { filePath, byStream };
}

export async function deleteObject(key: string) {
  await ossClient.delete(key);
}

export async function copyObject(source: string) {
  const parsedPath = path.parse(source);
  const target = `${parsedPath.dir}/${parsedPath.name} copy${parsedPath.ext}`;
  await ossClient.copy(target, source);
}

export async function renameObject(source: string, newName: string) {
  await ossClient.copy(`${path.parse(source).dir}/${newName}`, source);
  await ossClient.delete(source);
}

export async function uploadObject(filePath: string, targetFolder: string) {
  const stat = await fsSync.stat(filePath);
  if (stat.isDirectory()) {
    return;
  }
  if (!targetFolder.endsWith("/")) {
    targetFolder += "/";
  }
  const ossPath = `${targetFolder}${path.basename(filePath)}`;
  await ossClient.put(ossPath, path.normalize(filePath));
}

export async function createFolder(name: string, targetFolder: string) {
  if (!name.endsWith("/")) {
    name += "/";
  }
  if (name.startsWith("/")) {
    name = name.substring(1, name.length);
  }
  if (!targetFolder.endsWith("/")) {
    targetFolder += "/";
  }
  await ossClient.put(`${targetFolder}${name}`, Buffer.from(""));
}

export async function getFileDetailMarkdown(file: IObject, url: string): Promise<string> {
  const ext = path.extname(file.name);
  if (ImgExts.includes(ext.toLowerCase())) {
    return `![](${url})`;
  }
  if (CodeExts.includes(ext.toLowerCase())) {
    const code = await got.get(url);
    return "```\n" + code.body + "\n```";
  }
  if (MdExt === ext.toLowerCase()) {
    const md = await got.get(url);
    return md.body;
  }
  if (PlainTextExts.includes(ext.toLowerCase())) {
    const text = await got.get(url);
    return text.body;
  }
  return `⚠️ Sorry ~ Raycast does not yet support previewing ${path.extname(file.name)} files`;
}

async function getFileDownloadLocation(): Promise<string> {
  const preferences: IPreferences = getPreferenceValues();
  if (preferences.downloadLoc) {
    let downloadLoc = preferences.downloadLoc;
    if (!downloadLoc.endsWith("/")) {
      downloadLoc += "/";
    }
    await folderExists(downloadLoc);
    return downloadLoc;
  }
  return `${homedir()}/Desktop/`;
}

async function mkdir(folder: string): Promise<boolean> {
  try {
    await fsSync.mkdir(folder);
    return true;
  } catch (error) {
    return false;
  }
}

async function folderExists(folder: string): Promise<boolean> {
  try {
    const isExists = await fsSync.stat(folder);
    if (isExists.isDirectory()) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    const tempFolder = path.parse(folder).dir;
    const status = await folderExists(tempFolder);
    if (status) {
      return await mkdir(folder);
    }
    return false;
  }
}

export function getLocalKeyByFolder(folder: string): string {
  const preferences: IPreferences = getPreferenceValues();
  return `${preferences.bucket}_${folder}`;
}

export function getFolderByLocalKey(key: string): string {
  const preferences: IPreferences = getPreferenceValues();
  return key.slice(preferences.bucket.length + 1, key.length);
}

export function filterBookmark(key: string): boolean {
  const preferences: IPreferences = getPreferenceValues();
  return key.indexOf(`${preferences.bucket}_`) === 0;
}

export async function getObjUrl(file: IObject): Promise<IObjectURLAndACL> {
  const preferences: IPreferences = getPreferenceValues();
  const objACL = await ossClient.getACL(file.name);
  let bucketACL = "";
  if (objACL.acl == ACL.Private) {
    return { url: ossClient.signatureUrl(file.name), acl: objACL.acl };
  }
  if (`${objACL.acl}` == ACL.Default) {
    const bACL = await ossClient.getBucketACL(preferences.bucket);
    bucketACL = bACL.acl;
    if (bucketACL == ACL.Private) {
      return { url: ossClient.signatureUrl(file.name), acl: objACL.acl, bucketAcl: bucketACL };
    }
  }
  return { url: file.url, acl: objACL.acl, bucketAcl: bucketACL };
}
