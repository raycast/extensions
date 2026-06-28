import { getPreferenceValues } from "@raycast/api";
import OSS from "ali-oss";
import path from "node:path";
import fsSync from "node:fs/promises";
import fs from "node:fs";
import crypto from "node:crypto";
import { ACL, AudioExts, CodeExts, FileType, ImgExts, MdExt, PlainTextExts, RenameType, VideoExts } from "./const";
import { homedir } from "os";
import got from "got";

let ossClient: OSS;
let currentBucket: string;

export function newOssClient(bucket?: string, region?: string): boolean {
  if (bucket === currentBucket && ossClient) {
    return false;
  }
  const preferences: IPreferences = getPreferenceValues();
  ossClient = new OSS({
    endpoint: preferences.endPoint,
    cname: preferences.useCustomDomain,
    region: region,
    accessKeyId: preferences.accessKeyId,
    accessKeySecret: preferences.accessKeySecret,
    bucket: bucket,
    secure: true,
  });
  if (bucket) currentBucket = bucket;
  return true;
}

export async function getAllBuckets(): Promise<IBucket[]> {
  const buckets = await ossClient.listBuckets({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (buckets as any).buckets.map((b: any) => {
    return {
      name: b.name,
      region: b.region,
    };
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

export async function uploadObject(filePath: string, targetFolder: string): Promise<string> {
  if (!targetFolder.endsWith("/")) {
    targetFolder += "/";
  }
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  let name;
  switch (preferences.renameFileAs) {
    case RenameType.Original:
      name = path.basename(filePath);
      break;
    case RenameType.WithDate:
      name = nameWithDate(filePath);
      break;
    case RenameType.MD5:
      name = nameByMD5(filePath);
      break;
    default:
      name = path.basename(filePath);
      break;
  }
  const ossPath = `${targetFolder}${name}`;
  await ossClient.put(ossPath, path.normalize(filePath));
  return ossPath;
}

function nameWithDate(filePath: string): string {
  const original = path.basename(filePath);
  const date = new Date();
  const ext = path.extname(filePath);
  const year = date.getFullYear();
  const month = date.getMonth() >= 9 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`;
  const dat = date.getDate() >= 10 ? date.getDate() : `0${date.getDate()}`;
  const name = `${original.substring(0, original.lastIndexOf(ext))}_${year}-${month}-${dat}${ext}`;
  return name;
}

function nameByMD5(filePath: string): string {
  const content = fs.readFileSync(filePath);
  const md5 = crypto.createHash("md5");
  return `${md5.update(content).digest("hex")}${path.extname(filePath)}`;
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
  const fileType = getFileType(file.name);
  let markdown = "";
  switch (fileType) {
    case FileType.Img:
      markdown = `![](${url})`;
      break;
    case FileType.Code:
      markdown = "```\n" + (await got.get(url)).body + "\n```";
      break;
    case FileType.MarkDown:
      markdown = (await got.get(url)).body;
      break;
    case FileType.Text:
      markdown = (await got.get(url)).body;
      break;
    default:
      markdown = `⚠️ Sorry ~ Raycast does not yet support previewing ${path.extname(file.name)} files`;
  }
  return markdown;
}

export function getFileType(name: string): FileType {
  const ext = path.extname(name);
  if (ImgExts.includes(ext.toLowerCase())) {
    return FileType.Img;
  }
  if (CodeExts.includes(ext.toLowerCase())) {
    return FileType.Code;
  }
  if (MdExt === ext.toLowerCase()) {
    return FileType.MarkDown;
  }
  if (PlainTextExts.includes(ext.toLowerCase())) {
    return FileType.Text;
  }
  if (AudioExts.includes(ext.toLowerCase())) {
    return FileType.Audio;
  }
  if (VideoExts.includes(ext.toLowerCase())) {
    return FileType.Video;
  }
  return FileType.Unknown;
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
  return `${currentBucket}_${folder}`;
}

export function getFolderByLocalKey(key: string): string {
  return key.slice(currentBucket.length + 1, key.length);
}

export function filterBookmark(key: string): boolean {
  return key.indexOf(`${currentBucket}_`) === 0;
}

export async function getObjUrl(ossKey: string): Promise<IObjectURLAndACL> {
  const objACL = await ossClient.getACL(ossKey);
  let bucketACL = "";
  if (objACL.acl == ACL.Private) {
    return { url: ossClient.signatureUrl(ossKey), acl: objACL.acl };
  }
  if (`${objACL.acl}` == ACL.Default) {
    const bACL = await ossClient.getBucketACL(currentBucket);
    bucketACL = bACL.acl;
    if (bucketACL == ACL.Private) {
      return { url: ossClient.signatureUrl(ossKey), acl: objACL.acl, bucketAcl: bucketACL };
    }
  }
  return { url: ossClient.generateObjectUrl(ossKey), acl: objACL.acl, bucketAcl: bucketACL };
}
