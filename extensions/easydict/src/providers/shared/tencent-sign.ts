/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { BinaryToTextEncoding } from "node:crypto";
import crypto from "node:crypto";

import { ProviderConfig } from "@/providers/shared/config";

const SECRET_ID = ProviderConfig.tencentSecretId;
const SECRET_KEY = ProviderConfig.tencentSecretKey;

const endpoint = "tmt.tencentcloudapi.com";
const region = "ap-guangzhou";
const service = "tmt";
const version = "2018-03-21";
const algorithm = "TC3-HMAC-SHA256";
const signedHeaders = "content-type;host";

function sha256(message: string, secret = "", encoding?: BinaryToTextEncoding) {
  const hmac = crypto.createHmac("sha256", secret);
  return hmac.update(message).digest(encoding as BinaryToTextEncoding);
}

function getHash(message: string) {
  const hash = crypto.createHash("sha256");
  return hash.update(message).digest("hex");
}

function getDate(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * Generate Tencent Cloud TC3-HMAC-SHA256 signature and return request config.
 *
 * Docs: https://cloud.tencent.com/document/api/551/15619
 */
export function tencentSign(action: string, payload: Record<string, unknown>) {
  const timestamp = Math.trunc(new Date().getTime() / 1000);
  const date = getDate(timestamp);

  const hashedRequestPayload = getHash(JSON.stringify(payload));
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = "content-type:application/json; charset=utf-8\n" + "host:" + endpoint + "\n";

  const canonicalRequest =
    httpRequestMethod +
    "\n" +
    canonicalUri +
    "\n" +
    canonicalQueryString +
    "\n" +
    canonicalHeaders +
    "\n" +
    signedHeaders +
    "\n" +
    hashedRequestPayload;

  const hashedCanonicalRequest = getHash(canonicalRequest);
  const credentialScope = date + "/" + service + "/" + "tc3_request";
  const stringToSign = algorithm + "\n" + timestamp + "\n" + credentialScope + "\n" + hashedCanonicalRequest;

  const kDate = sha256(date, "TC3" + SECRET_KEY);
  const kService = sha256(service, kDate);
  const kSigning = sha256("tc3_request", kService);
  const signature = sha256(stringToSign, kSigning, "hex");

  const authorization =
    algorithm +
    " " +
    "Credential=" +
    SECRET_ID +
    "/" +
    credentialScope +
    ", " +
    "SignedHeaders=" +
    signedHeaders +
    ", " +
    "Signature=" +
    signature;

  return {
    url: `https://${endpoint}`,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: endpoint,
      "X-TC-Action": action,
      "X-TC-Timestamp": timestamp.toString(),
      "X-TC-Version": version,
      "X-TC-Region": region,
    },
  };
}

export interface TencentError {
  Code: string;
  Message: string;
}
