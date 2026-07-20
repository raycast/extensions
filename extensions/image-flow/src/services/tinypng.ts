import { createReadStream } from "fs";
import fetch, { BodyInit } from "node-fetch";
import { Image } from "../types";

const ShortenURL = "https://api.tinify.com/shrink";

type ResponseScheme = {
  output: {
    size: number;
    url: string;
  };
  error?: string;
  message?: string;
};

async function upload(image: Image, key: string): Promise<string> {
  switch (image.type) {
    case "url":
      return uploadWithURL(image.value, key);
    case "filepath":
      return uploadWithFile(image.value, key);
    default:
      throw new Error(`unsupported image type when uploading to tinypng, expected url or filepath, got ${image.type}`);
  }
}

async function uploadWithFile(file: string, key: string): Promise<string> {
  const stream = createReadStream(file);

  return _upload(stream, key);
}

async function uploadWithURL(url: string, key: string): Promise<string> {
  if (isPrivateURL(url)) {
    return url;
  }

  return _upload(JSON.stringify({ source: { url } }), key);
}

/**
 * Compress the image(only compress, not resize)
 *
 * source: https://tinypng.com/developers/reference#compressing-images
 *
 * @param url
 */
async function compress(url: string): Promise<NodeJS.ReadableStream | null> {
  const res = await fetch(url);

  return res.body;
}

/**
 * Compress and resize the image
 *
 * source: https://tinypng.com/developers/reference#resizing-images
 *
 * @param url
 * @param key
 * @param options
 */
async function compressAndResize(
  url: string,
  key: string,
  options: {
    method: string;
    width?: number;
    height?: number;
  },
): Promise<NodeJS.ReadableStream | null> {
  return operate(url, key, JSON.stringify({ resize: options }));
}

/**
 * Convert the image to a different format
 *
 * source: https://tinypng.com/developers/reference#converting-images
 *
 * @param url
 * @param key
 * @param options
 * @param transform
 */
async function convert(
  url: string,
  key: string,
  options: {
    type: string | string[];
  },
  transform?: { background: string },
): Promise<NodeJS.ReadableStream | null> {
  return operate(url, key, JSON.stringify({ convert: options, transform }));
}

async function operate(url: string, key: string, body?: BodyInit | null): Promise<NodeJS.ReadableStream | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from("api:" + key).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (res.status >= 300) {
    const json = (await res.json()) as ResponseScheme;

    if ("error" in json && json.error) {
      throw new Error(`${json.error}, ${json.message}`);
    }

    throw new Error(`failed to operate image on tinypng, status: ${res.status}`);
  }

  return res.body;
}

async function _upload(body: BodyInit | null, key: string): Promise<string> {
  const res = await fetch(ShortenURL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from("api:" + key).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const json = (await res.json()) as ResponseScheme;

  if ("error" in json && json.error) {
    throw new Error(`failed to upload image to tinypng, error: ${json.error}, message: ${json.message}`);
  }

  return json.output.url as string;
}

/**
 * Check if the URL is a private URL like https://api.tinify.com/output/abc123
 *
 * @param url
 * @returns boolean
 */
function isPrivateURL(url: string): boolean {
  return url.includes("api.tinify.com/output");
}

export default {
  compress,
  compressAndResize,
  upload,
  convert,
};
