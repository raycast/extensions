import { createCipheriv, pbkdf2Sync, randomBytes } from "crypto";
import base58 from "bs58";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import pako from "pako";
import * as fs from "node:fs";
import mime from "mime-types";
import path from "node:path";

interface PasteData {
  v: number;
  adata: PasteAdata;
  ct: string;
  meta: { expire: string };
}

type IntTrueFalse = 1 | 0;

type PasteAdata = [
  [string, string, number, number, number, string, string, string],
  string,
  IntTrueFalse,
  IntTrueFalse,
];

interface PasteResponse {
  status: 0;
  id: string;
  url: string;
  deleteToken: string;
}

export async function createPaste(
  pasteText: string,
  expiration: string,
  pastePassword: string = "",
  burnAfterRead: boolean = false,
  filePath: string | null = null,
): Promise<{ pasteData: PasteData; id: string; pasteKey: string }> {
  let pasteData = { paste: pasteText };

  if (filePath) {
    pasteData = { ...pasteData, ...(await createAttachmentData(filePath)) };
  }

  const pasteKey = randomBytes(32);

  const kdfSalt = randomBytes(8);
  const kdfIterations = 100000;
  const kdfKeysize = 32;

  const cipherIv = randomBytes(16);
  const cipherTagSize = 128;
  const cipherAlgo = "aes-256-gcm";

  const pastePassphrase = pastePassword ? Buffer.concat([pasteKey, Buffer.from(pastePassword)]) : pasteKey;
  const kdfKey = pbkdf2Sync(pastePassphrase, kdfSalt, kdfIterations, kdfKeysize, "sha256");

  const pasteBlob = Buffer.from(pako.deflateRaw(JSON.stringify(pasteData)));

  const pasteAdata: PasteAdata = [
    [
      cipherIv.toString("base64"),
      kdfSalt.toString("base64"),
      kdfIterations,
      kdfKeysize * 8,
      cipherTagSize,
      "aes",
      "gcm",
      "zlib", // Compression
    ],
    "plaintext", // Formatting
    0, // Open discussion
    burnAfterRead ? 1 : 0, // Burn after reading
  ];

  const cipher = createCipheriv(cipherAlgo, kdfKey, cipherIv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(JSON.stringify(pasteAdata), "utf8"));
  const cipherText = Buffer.concat([cipher.update(pasteBlob), cipher.final(), cipher.getAuthTag()]);

  const pasteObject = {
    v: 2,
    adata: pasteAdata,
    ct: cipherText.toString("base64"),
    meta: {
      expire: expiration,
    },
  };

  const response = await postToPrivateBin(pasteObject);

  return {
    pasteData: pasteObject,
    id: response.id,
    pasteKey: base58.encode(pasteKey),
  };
}

async function createAttachmentData(filePath: string) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const mimeType = mime.lookup(filePath) || "application/octet-stream";
  const base64Data = fileBuffer.toString("base64");
  const dataURI = `data:${mimeType};base64,${base64Data}`;
  const fileName = path.basename(filePath);

  return {
    attachment: dataURI,
    attachment_name: fileName,
  };
}

async function postToPrivateBin(pasteData: PasteData): Promise<PasteResponse> {
  const { url } = getPreferenceValues();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Requested-With": "JSONHttpRequest",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pasteData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to POST to '${url}' (${response.statusText}): ${errorText}`);
  }

  return (await response.json()) as PasteResponse;
}
