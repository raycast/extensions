/*
 * @author: tisfeng
 * @createTime: 2022-09-26 15:53
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-31 16:05
 * @fileName: volcanoSign.js
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import CryptoJS from "crypto-js";
import { AppKeyStore } from "../../preferences";

const accessKey = AppKeyStore.volcanoSecretId;
const secretKey = AppKeyStore.volcanoSecretKey;

/**
 * Check has Volcano AppId and AppKey.
 */
export function hasVolcanoAppKey() {
  const AppId = AppKeyStore.volcanoSecretId;
  const AppSecret = AppKeyStore.volcanoSecretKey;

  if (AppId && AppSecret) {
    return true;
  } else {
    return false;
  }
}

/**
 * Generate Volcano Sign.
 *
 * Docs: https://www.volcengine.com/docs/4640/65067
 *
 * Ref: https://github.com/KrisLee1/panda-dict/blob/main/src/assets/script/APIs.js#L134
 */
export const genVolcanoSign = function (query, params) {
  if (!hasVolcanoAppKey()) {
    return undefined;
  }

  const Query = {
    query: query,
    toString: function () {
      let queryList = [];
      for (let key of Object.keys(this.query).sort()) {
        queryList.push(`${key}=${this.query[key]}`);
      }
      return queryList.join("&");
    },
  };

  const Body = {
    body: params,
    toString: function () {
      return JSON.stringify(this.body);
    },
  };

  const Credentials = {
    ak: accessKey,
    sk: secretKey,
    service: "translate",
    region: "cn-north-1",
  };

  function getXDate() {
    function leftPad(n) {
      return n < 10 ? "0" + n : n;
    }
    const now = new Date();
    const format = [
      now.getUTCFullYear(),
      leftPad(now.getUTCMonth() + 1),
      leftPad(now.getUTCDate()),
      "T",
      leftPad(now.getUTCHours()),
      leftPad(now.getUTCMinutes()),
      leftPad(now.getUTCSeconds()),
      "Z",
    ];
    return format.join("");
  }

  const curTime = getXDate();

  const MetaData = {
    algorithm: "HMAC-SHA256",
    service: Credentials.service,
    region: Credentials.region,
    date: curTime.substring(0, 8),
    getCredentialScope: function () {
      return `${this.date}/${this.region}/${this.service}/request`;
    },
  };

  const Header = {
    headers: {
      "Content-Type": "application/json",
      "X-Date": curTime,
      "X-Content-Sha256": CryptoJS.SHA256(Body.toString()).toString(CryptoJS.enc.Hex),
    },
    getSignedHeaders: function () {
      let headerList = [];
      for (let key of Object.keys(this.headers).sort()) {
        headerList.push(key.toLocaleLowerCase());
      }
      return headerList.join(";");
    },
    toString: function () {
      let str = "";
      for (let key of Object.keys(this.headers).sort()) {
        str += `${key.toLocaleLowerCase()}:${this.headers[key]}\n`;
      }
      return str;
    },
  };

  const getSigningKey = function (sk, date, region, service) {
    const kdate = CryptoJS.HmacSHA256(date, sk);
    const kregion = CryptoJS.HmacSHA256(region, kdate);
    const kservice = CryptoJS.HmacSHA256(service, kregion);
    return CryptoJS.HmacSHA256("request", kservice);
  };

  const canonicalRequest = [
    "POST",
    "/",
    Query.toString(),
    Header.toString(),
    Header.getSignedHeaders(),
    Header.headers["X-Content-Sha256"],
  ].join("\n");
  const hashCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex);
  const signing_str = [MetaData.algorithm, curTime, MetaData.getCredentialScope(), hashCanonicalRequest].join("\n");
  const signing_key = getSigningKey(Credentials.sk, MetaData.date, MetaData.region, MetaData.service);
  const sign = CryptoJS.HmacSHA256(signing_str, signing_key).toString(CryptoJS.enc.Hex);

  const Authorization = [
    `${MetaData.algorithm} Credential=${Credentials.ak}/${MetaData.getCredentialScope()}`,
    "SignedHeaders=" + Header.getSignedHeaders(),
    `Signature=${sign}`,
  ];

  Header.headers["Authorization"] = Authorization.join(", ");

  return {
    getUrl: function () {
      return "https://open.volcengineapi.com/?" + Query.toString();
    },
    getConfig: function () {
      return {
        headers: Header.headers,
      };
    },
  };
};
