import axios from "axios";
import FormData from "form-data";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getSelectedFinderItems } from "@raycast/api";

export const uploadFile = (fileBuffer: Buffer, fileName: string, fileExt: string, subPath?: string) => {
  console.log({ fileName, fileExt, subPath });
  const formData = new FormData();
  formData.append("content", fileBuffer, fileName);
  formData.append("file_name", fileName);
  if (subPath) {
    formData.append("file_path", subPath);
  }
  if (fileExt) {
    formData.append("file_type", `image/${fileExt}`);
  }
  return axios
    .post("https://ucm.laiye.com/api/dialogue/upload/file", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
    .then((res) => {
      const { data, error } = res.data;

      if (error?.error_code !== 0) {
        return Promise.reject(error.error_detail);
      } else {
        return Promise.resolve(data?.url);
      }
    })
    .catch(Promise.reject);
};

export const isImage = (type: string) => {
  const defalutTypes = ["png", "jpg", "jpeg", "webp", "gif", "ico"];
  return defalutTypes.includes(type);
};
export const getFile = async (filePath: string) => {
  const data = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1);
  const type = ext ? ext : "png";
  const hash = crypto.createHash("sha256").update(data).digest("hex").substring(0, 15);
  const name = hash + (type ? `.${type}` : "");

  return {
    hash,
    type,
    fileBuffer: data,
    fileName: name,
    fileExt: type
  };
};

export const toUnit = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = 0;
  let unit = units[unitIndex];
  while (size >= 1024) {
    size /= 1024;
    unitIndex++;
    unit = units[unitIndex];
  }
  return `${size.toFixed(2)} ${unit}`;
};

export const getDetailImage = (origin: string, height: number) => {
  const url = new URL(origin);
  const [appId, ...rest] = url.pathname.split("/").slice(1);
  url.pathname = "/" + [appId, `tr:h-${height},f-auto`, ...rest].join("/");
  const optimizedUrl = url.toString();
  return optimizedUrl;
};

export const getFinderSelectedImages = async () => {
  try {
    const finder = await getSelectedFinderItems();
    return finder;
  } catch {
    return [];
  }
};
