import { Cache, closeMainWindow, getPreferenceValues, open, PopToRootType, showHUD, showToast } from "@raycast/api";
import {
  HistoriesCacheKey,
  LANG_LIST,
  TempOCRImgName,
  TransAPIErrCode,
  TransServiceProviderTp,
  OCRServiceProviderTp,
  TRANS_SERVICES_NOT_SUPPORT_LANGS,
  BaiduOCRTokenCacheKey,
  BUILD_IN_SPACE_OCR_API_KEY,
} from "./const";
import axios from "axios";
import crypto from "crypto";
import querystring from "node:querystring";
import { LanguageConflict, OCRServiceProviderMiss, ServiceProviderMiss } from "../components/TranslateError";
import translate from "@vitalets/google-translate-api";
import Core from "@alicloud/pop-core";
import { execSync } from "child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import FormData from "form-data";

const apiFetchMap = new Map<
  TransServiceProviderTp,
  (queryText: string, targetLang: ILangItem, serviceProvider: ITransServiceProvider) => Promise<ITranslateRes>
>([
  [TransServiceProviderTp.Google, fetchGoogleTransAPI],
  [TransServiceProviderTp.GoogleCouldTrans, fetchGoogleCouldTransAPI],
  [TransServiceProviderTp.DeepL, fetchDeepLTransAPI],
  [TransServiceProviderTp.MicrosoftAzure, fetchMicrosoftAzureTransAPI],
  [TransServiceProviderTp.Youdao, fetchYoudaoTransAPI],
  [TransServiceProviderTp.Baidu, fetchBaiduTransAPI],
  [TransServiceProviderTp.Tencent, fetchTencentTransAPI],
  [TransServiceProviderTp.Aliyun, fetchAliyunTransAPI],
]);

export function checkPreferences() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const langFirst: ILangItem = getLang(preferences.langFirst);
  const langSecond: ILangItem = getLang(preferences.langSecond);
  if (langFirst.langId === langSecond.langId) {
    return <LanguageConflict />;
  }
  return checkService(preferences.defaultServiceProvider, true);
}

export function checkService(service: TransServiceProviderTp, checkEnable?: boolean) {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  let checkCfg = true;
  let disabled = true;
  switch (service) {
    case TransServiceProviderTp.Google:
      checkCfg = true;
      disabled = preferences.disableGoogleFree;
      break;
    case TransServiceProviderTp.GoogleCouldTrans:
      if (!preferences.googleApiKey) checkCfg = false;
      disabled = preferences.disableGoogleCould;
      break;
    case TransServiceProviderTp.DeepL:
      if (!preferences.deeplAuthKey) checkCfg = false;
      disabled = preferences.disableDeepL;
      break;
    case TransServiceProviderTp.MicrosoftAzure:
      if (!preferences.microsoftAccessKey) checkCfg = false;
      disabled = preferences.disableMicrosoft;
      break;
    case TransServiceProviderTp.Baidu:
      if (!preferences.baiduAppId || !preferences.baiduAppKey) checkCfg = false;
      disabled = preferences.disableBaidu;
      break;
    case TransServiceProviderTp.Youdao:
      if (!preferences.youdaoAppId || !preferences.youdaoAppKey) checkCfg = false;
      disabled = preferences.disableYoudao;
      break;
    case TransServiceProviderTp.Tencent:
      if (!preferences.tencentAppId || !preferences.tencentAppKey) checkCfg = false;
      disabled = preferences.disableTencent;
      break;
    case TransServiceProviderTp.Aliyun:
      if (!preferences.aliyunAccessKeyId || !preferences.aliyunAccessKeySecret) checkCfg = false;
      disabled = preferences.disableAliyun;
      break;
  }
  if (!checkCfg) {
    return <ServiceProviderMiss service={service} />;
  }
  if (checkEnable && disabled) {
    return <ServiceProviderMiss service={service} disabled />;
  }
  return null;
}

export function getLang(value: string): ILangItem {
  return (
    LANG_LIST.find((lang) =>
      [
        lang.langId,
        lang.googleLangId,
        lang.deeplLangId,
        lang.baiduLangId,
        lang.tencentLangId,
        lang.youdaoLangId,
        lang.aliyunLangId,
        lang.microsoftLangId,
      ].includes(value)
    ) || {
      langId: "unknown",
      langTitle: "unknown",
    }
  );
}

export function getMultipleLangs(): ILangItem[] {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  return LANG_LIST.filter((lang) => {
    const key = `mul${lang.langId.slice(0, 1).toUpperCase()}${lang.langId.slice(1)}`;
    return preferences[key as keyof IPreferences];
  });
}

export function getServiceProviderMap(): Map<TransServiceProviderTp, ITransServiceProvider> {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const serviceProviderMap = new Map<TransServiceProviderTp, ITransServiceProvider>([]);
  switch (preferences.defaultServiceProvider) {
    case TransServiceProviderTp.Google:
      if (preferences.disableGoogleFree) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: "",
        appKey: "",
      });
      break;
    case TransServiceProviderTp.GoogleCouldTrans:
      if (preferences.disableGoogleCould) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: "",
        appKey: preferences.googleApiKey,
      });
      break;
    case TransServiceProviderTp.DeepL:
      if (preferences.disableDeepL) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: "",
        appKey: preferences.deeplAuthKey,
      });
      break;
    case TransServiceProviderTp.MicrosoftAzure:
      if (preferences.disableMicrosoft) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: preferences.microsoftAPIEndpoint,
        appKey: preferences.microsoftAccessKey,
      });
      break;
    case TransServiceProviderTp.Baidu:
      if (preferences.disableBaidu) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: preferences.baiduAppId,
        appKey: preferences.baiduAppKey,
      });
      break;
    case TransServiceProviderTp.Youdao:
      if (preferences.disableYoudao) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: preferences.youdaoAppId,
        appKey: preferences.youdaoAppKey,
      });
      break;
    case TransServiceProviderTp.Tencent:
      if (preferences.disableTencent) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: preferences.tencentAppId,
        appKey: preferences.tencentAppKey,
      });
      break;
    case TransServiceProviderTp.Aliyun:
      if (preferences.disableAliyun) break;
      serviceProviderMap.set(preferences.defaultServiceProvider, {
        serviceProvider: preferences.defaultServiceProvider,
        appId: preferences.aliyunAccessKeyId,
        appKey: preferences.aliyunAccessKeySecret,
      });
      break;
  }
  if (!preferences.disableGoogleFree && preferences.defaultServiceProvider != TransServiceProviderTp.Google) {
    serviceProviderMap.set(TransServiceProviderTp.Google, {
      serviceProvider: TransServiceProviderTp.Google,
      appId: "",
      appKey: "",
    });
  }
  if (
    preferences.googleApiKey &&
    !preferences.disableGoogleCould &&
    preferences.defaultServiceProvider != TransServiceProviderTp.GoogleCouldTrans
  ) {
    serviceProviderMap.set(TransServiceProviderTp.GoogleCouldTrans, {
      serviceProvider: TransServiceProviderTp.GoogleCouldTrans,
      appId: "",
      appKey: preferences.googleApiKey,
    });
  }
  if (
    preferences.deeplAuthKey &&
    !preferences.disableDeepL &&
    preferences.defaultServiceProvider != TransServiceProviderTp.DeepL
  ) {
    serviceProviderMap.set(TransServiceProviderTp.DeepL, {
      serviceProvider: TransServiceProviderTp.DeepL,
      appId: "",
      appKey: preferences.deeplAuthKey,
    });
  }
  if (
    preferences.microsoftAccessKey &&
    !preferences.disableMicrosoft &&
    preferences.defaultServiceProvider != TransServiceProviderTp.MicrosoftAzure
  ) {
    serviceProviderMap.set(TransServiceProviderTp.MicrosoftAzure, {
      serviceProvider: TransServiceProviderTp.MicrosoftAzure,
      appId: preferences.microsoftAPIEndpoint,
      appKey: preferences.microsoftAccessKey,
    });
  }
  if (
    preferences.youdaoAppId &&
    preferences.youdaoAppKey &&
    !preferences.disableYoudao &&
    preferences.defaultServiceProvider != TransServiceProviderTp.Youdao
  ) {
    serviceProviderMap.set(TransServiceProviderTp.Youdao, {
      serviceProvider: TransServiceProviderTp.Youdao,
      appId: preferences.youdaoAppId,
      appKey: preferences.youdaoAppKey,
    });
  }
  if (
    preferences.baiduAppId &&
    preferences.baiduAppKey &&
    !preferences.disableBaidu &&
    preferences.defaultServiceProvider != TransServiceProviderTp.Baidu
  ) {
    serviceProviderMap.set(TransServiceProviderTp.Baidu, {
      serviceProvider: TransServiceProviderTp.Baidu,
      appId: preferences.baiduAppId,
      appKey: preferences.baiduAppKey,
    });
  }
  if (
    preferences.tencentAppId &&
    preferences.tencentAppKey &&
    !preferences.disableTencent &&
    preferences.defaultServiceProvider != TransServiceProviderTp.Tencent
  ) {
    serviceProviderMap.set(TransServiceProviderTp.Tencent, {
      serviceProvider: TransServiceProviderTp.Tencent,
      appId: preferences.tencentAppId,
      appKey: preferences.tencentAppKey,
    });
  }
  if (
    preferences.aliyunAccessKeyId &&
    preferences.aliyunAccessKeySecret &&
    !preferences.disableAliyun &&
    preferences.defaultServiceProvider != TransServiceProviderTp.Aliyun
  ) {
    serviceProviderMap.set(TransServiceProviderTp.Aliyun, {
      serviceProvider: TransServiceProviderTp.Aliyun,
      appId: preferences.aliyunAccessKeyId,
      appKey: preferences.aliyunAccessKeySecret,
    });
  }
  return serviceProviderMap;
}

export function fetchTransAPIs(queryText: string, targetLang: ILangItem): Promise<ITranslateRes>[] {
  const serviceProviderMap = getServiceProviderMap();
  const allPromise: Promise<ITranslateRes>[] = [];
  serviceProviderMap.forEach((service) => {
    const apiFunc = apiFetchMap.get(service.serviceProvider);
    if (apiFunc) {
      allPromise.push(retryTransApi(() => apiFunc(queryText, targetLang, service), 3, 400));
    }
  });
  return allPromise;
}

export function fetchMultipleTransAPIs(queryText: string, targetLangs: ILangItem[]): Promise<ITranslateRes>[] {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const defaultServiceTp = preferences.multipleServiceProvider;
  const defaultService = getServiceProviderMap().get(defaultServiceTp);
  if (!defaultService) return [];
  const allPromise: Promise<ITranslateRes>[] = [];
  targetLangs.forEach((lang) => {
    const apiFunc = apiFetchMap.get(defaultServiceTp);
    if (apiFunc) {
      allPromise.push(retryTransApi(() => apiFunc(queryText, lang, defaultService), 3, 400));
    }
  });
  return allPromise;
}

function retryTransApi(fn: () => Promise<ITranslateRes>, times: number, delay: number): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const tFn = () => {
      fn().then((res) => {
        if (res.code === TransAPIErrCode.Success) {
          resolve(res);
        }
        if (res.code === TransAPIErrCode.Retry && times-- > 0) {
          setTimeout(tFn, delay);
        } else {
          resolve(res);
        }
      });
    };
    return tFn();
  });
}

export async function translateWithRefineLang(
  transPromise: Promise<ITranslateRes>,
  input: string,
  toLang: ILangItem
): Promise<ITranslateRes> {
  let transRes = await transPromise;
  if (transRes.from === transRes.to) {
    const fetchApi = apiFetchMap.get(transRes.serviceProvider);
    const serviceProvider = getServiceProviderMap().get(transRes.serviceProvider);
    if (fetchApi && serviceProvider) {
      transRes = await retryTransApi(() => fetchApi(input, toLang, serviceProvider), 3, 400);
    }
  }
  return transRes;
}

function fetchDeepLTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    const preferences: IPreferences = getPreferenceValues<IPreferences>();
    const fromLang = "auto";
    const APP_KEY = provider.appKey;
    const pro = preferences.deeplApiPro;
    axios
      .get(
        `https://api${pro ? "" : "-free"}.deepl.com/v2/translate?auth_key=${APP_KEY}&` +
          querystring.stringify({
            text: queryText,
            target_lang: targetLang.deeplLangId || targetLang.langId,
          })
      )
      .then((res) => {
        const resDate: IDeepLTranslateResult = res.data;
        let code = TransAPIErrCode.Success;
        if (resDate.translations.length == 0) {
          code = TransAPIErrCode.Fail;
        }
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          from:
            code === TransAPIErrCode.Success ? getLang(resDate.translations[0].detected_source_language) : getLang(""),
          to: targetLang,
          origin: queryText,
          res: code === TransAPIErrCode.Success ? resDate.translations[0].text : "",
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          to: targetLang,
          origin: queryText,
          res: "",
        };
        resolve(transRes);
      });
  });
}

function fetchMicrosoftAzureTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    const preferences: IPreferences = getPreferenceValues<IPreferences>();
    const fromLang = "auto";
    const ENDPOINT = provider.appId;
    const APP_KEY = provider.appKey;
    const payload = [{ Text: queryText }];
    axios
      .post(
        `${ENDPOINT}/translate?` +
          querystring.stringify({
            "api-version": "3.0",
            to: targetLang.microsoftLangId || targetLang.langId,
          }),
        payload,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": APP_KEY,
            "Content-Type": "application/json; charset=UTF-8",
            "Ocp-Apim-Subscription-Region": preferences.microsoftRegion,
          },
        }
      )
      .then((res) => {
        const resDate: IMicrosoftAzureTranslateResult[] = res.data;
        let code = TransAPIErrCode.Success;
        if (resDate.length == 0 || resDate[0].translations.length == 0) {
          code = TransAPIErrCode.Fail;
        }
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          from: code === TransAPIErrCode.Success ? getLang(resDate[0].detectedLanguage.language) : getLang(""),
          to: targetLang,
          origin: queryText,
          res: code === TransAPIErrCode.Success ? resDate[0].translations[0].text : "",
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          to: targetLang,
          origin: queryText,
          res: "",
        };
        resolve(transRes);
      });
  });
}

function fetchGoogleCouldTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    const fromLang = "auto";
    const APP_KEY = provider.appKey;
    axios
      .post(
        `https://translation.googleapis.com/language/translate/v2?` +
          querystring.stringify({
            key: APP_KEY,
            q: queryText,
            format: "text",
            target: targetLang.googleLangId || targetLang.langId,
          })
      )
      .then((res) => {
        const resDate: IGoogleCloudTranslateResult = res.data.data;
        let code = TransAPIErrCode.Success;
        if (resDate.translations.length == 0) {
          code = TransAPIErrCode.Fail;
        }
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          from:
            code === TransAPIErrCode.Success ? getLang(resDate.translations[0].detectedSourceLanguage) : getLang(""),
          to: targetLang,
          origin: queryText,
          res: code === TransAPIErrCode.Success ? resDate.translations[0].translatedText : "",
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          to: targetLang,
          origin: queryText,
          res: "",
        };
        resolve(transRes);
      });
  });
}

function fetchGoogleTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    const fromLang = "auto";
    const preferences: IPreferences = getPreferenceValues<IPreferences>();
    const opt = Number(preferences.googleFreeTimeout)
      ? { timeout: Number(preferences.googleFreeTimeout), retry: 0 }
      : {};
    translate(
      queryText,
      { to: targetLang.googleLangId || targetLang.langId, from: fromLang, tld: preferences.googleFreeTLD },
      opt
    )
      .then((res) => {
        const resDate: IGoogleTranslateResult = res;
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Success,
          from: getLang(resDate.from.language.iso),
          to: targetLang,
          origin: queryText,
          res: resDate.text,
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          to: targetLang,
          origin: queryText,
          res: "",
        };
        resolve(transRes);
      });
  });
}

function fetchYoudaoTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    function truncate(q: string): string {
      const len = q.length;
      return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len);
    }
    const fromLang = "auto";
    const APP_ID = provider.appId;
    const APP_KEY = provider.appKey;

    const sha256 = crypto.createHash("sha256");
    const timestamp = Math.round(new Date().getTime() / 1000);
    const salt = timestamp;
    const sha256Content = APP_ID + truncate(queryText) + salt + timestamp + APP_KEY;
    const sign = sha256.update(sha256Content).digest("hex");

    axios
      .post(
        "https://openapi.youdao.com/api",
        querystring.stringify({
          sign,
          salt,
          strict: true,
          from: fromLang,
          signType: "v3",
          q: queryText,
          appKey: APP_ID,
          curtime: timestamp,
          to: targetLang.youdaoLangId || targetLang.langId,
        })
      )
      .then((res) => {
        const resDate: IYouDaoTranslateResult = res.data;
        let code = TransAPIErrCode.Fail;
        if (resDate.errorCode === "207") {
          code = TransAPIErrCode.Retry;
        }
        if (resDate.errorCode === "0") {
          code = TransAPIErrCode.Success;
        }
        const [from, to] = resDate.l.split("2");
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          from: getLang(from),
          to: getLang(to),
          origin: queryText,
          res: resDate.translation && resDate.translation.length > 0 ? resDate.translation[0] : "",
          fromPhonetic: resDate.basic?.phonetic,
          targetExplains: resDate.basic?.explains,
          derivatives: resDate.web,
          isWord: resDate.isWord,
          phonetic: resDate.basic?.phonetic,
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          to: targetLang,
          origin: queryText,
          res: "",
        };
        resolve(transRes);
      });
  });
}

function fetchBaiduTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    const fromLang = "auto";
    const APP_ID = provider.appId;
    const APP_KEY = provider.appKey;
    const md5 = crypto.createHash("md5");
    const salt = Math.round(new Date().getTime() / 1000);
    const md5Content = APP_ID + queryText + salt + APP_KEY;
    const sign = md5.update(md5Content).digest("hex");

    axios
      .post(
        "https://fanyi-api.baidu.com/api/trans/vip/translate",
        querystring.stringify({
          appid: APP_ID,
          from: fromLang,
          q: queryText,
          salt,
          sign,
          to: targetLang.baiduLangId || targetLang.langId,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      )
      .then((res) => {
        const resDate: IBaiduTranslateResult = res.data;
        let code = TransAPIErrCode.Success;
        if (["52001", "52002"].includes(resDate.errorCode)) {
          code = TransAPIErrCode.Retry;
        }
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          origin: queryText,
          from: getLang(resDate.from),
          to: getLang(resDate.to),
          res: resDate.trans_result && resDate.trans_result.length > 0 ? resDate.trans_result[0].dst : "",
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          origin: queryText,
          to: targetLang,
          res: "",
        };
        resolve(transRes);
      });
  });
}

function fetchTencentTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sha256(message: string, secret = "", encoding?: any) {
      const hmac = crypto.createHmac("sha256", secret);
      return hmac.update(message).digest(encoding);
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
    const fromLang = "auto";

    const SECRET_ID = provider.appId;
    const SECRET_KEY = provider.appKey;

    const endpoint = "tmt.tencentcloudapi.com";
    const service = "tmt";
    const region = "ap-shanghai";
    const action = "TextTranslate";
    const version = "2018-03-21";
    const timestamp = Math.trunc(new Date().getTime() / 1000);
    const date = getDate(timestamp);

    const signedHeaders = "content-type;host";

    const payload = {
      SourceText: queryText,
      Source: fromLang,
      Target: targetLang.tencentLangId || targetLang.langId,
      ProjectId: 0,
    };

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

    const algorithm = "TC3-HMAC-SHA256";
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
    axios
      .post(`https://${endpoint}`, payload, {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json; charset=utf-8",
          Host: endpoint,
          "X-TC-Action": action,
          "X-TC-Timestamp": timestamp.toString(),
          "X-TC-Version": version,
          "X-TC-Region": region,
        },
      })
      .then((res) => {
        const resDate: ITencentTranslateResult = res.data;
        let code = TransAPIErrCode.Success;
        if (resDate.Response.Error && ["InternalError.BackendTimeout"].includes(resDate.Response.Error.Code)) {
          code = TransAPIErrCode.Retry;
        }
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          from: getLang(resDate.Response.Source),
          to: getLang(resDate.Response.Target),
          origin: queryText,
          res: resDate.Response.TargetText,
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          origin: queryText,
          to: targetLang,
          res: "",
        };
        resolve(transRes);
      });
  });
}

async function fetchAliyunTransAPI(
  queryText: string,
  targetLang: ILangItem,
  provider: ITransServiceProvider
): Promise<ITranslateRes> {
  let fromLang = "auto";
  const APP_ID = provider.appId;
  const APP_KEY = provider.appKey;
  const client = new Core({
    accessKeyId: APP_ID,
    accessKeySecret: APP_KEY,
    endpoint: "https://mt.cn-hangzhou.aliyuncs.com",
    apiVersion: "2018-10-12",
  });

  const from = await client.request<IAliyunDetectLangResponse>(
    "GetDetectLanguage",
    { SourceText: queryText },
    { method: "POST" }
  );
  fromLang = from.DetectedLanguage;
  return new Promise<ITranslateRes>((resolve) => {
    const notSupport = checkServiceNotSupportLang(provider.serviceProvider, targetLang, queryText);
    if (notSupport) resolve(notSupport);
    const params = {
      RegionId: "cn-hangzhou",
      FormatType: "text",
      SourceLanguage: fromLang,
      TargetLanguage: targetLang.aliyunLangId || targetLang.langId,
      SourceText: queryText,
    };

    client
      .request<IAliyunTransResponse>("TranslateGeneral", params, { method: "POST" })
      .then((resDate) => {
        let code = TransAPIErrCode.Fail;
        if (resDate.Code === "10001") {
          code = TransAPIErrCode.Retry;
        }
        if (resDate.Code === "200") {
          code = TransAPIErrCode.Success;
        }
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: code,
          from: code === TransAPIErrCode.Success ? getLang(fromLang) : getLang(""),
          to: targetLang,
          origin: queryText,
          res: code === TransAPIErrCode.Success ? resDate.Data.Translated : "",
        };
        resolve(transRes);
      })
      .catch(() => {
        const transRes: ITranslateRes = {
          serviceProvider: provider.serviceProvider,
          code: TransAPIErrCode.Fail,
          from: getLang(fromLang),
          to: targetLang,
          origin: queryText,
          res: "",
        };
        resolve(transRes);
      });
  });
}

export const cache = new Cache();

export function getHistories(): ITransHistory[] {
  return JSON.parse(cache.get(HistoriesCacheKey) || "[]");
}

export function saveHistory(history: ITransHistory, limit: number) {
  const historiesCache: ITransHistory[] = JSON.parse(cache.get(HistoriesCacheKey) || "[]");
  if (historiesCache.unshift(history) > limit) historiesCache.pop();
  cache.set(HistoriesCacheKey, JSON.stringify(historiesCache));
}

export function clearAllHistory() {
  cache.remove(HistoriesCacheKey);
}

export function say(text: string, voice?: string) {
  try {
    const command = `say -v "${voice}" "${text.replace(/"/g, " ")}"`;
    execSync(command);
  } catch (error) {
    console.log(error);
  }
}

export function getVoiceList(): IVoice[] {
  try {
    const command = `say -v "?"`;
    return String(execSync(command))
      .split("\n")
      .filter((item) => item)
      .map((item) => {
        item = item.substring(0, item.indexOf("#")).trim();
        const res: IVoice = {
          voice: "",
          code: "",
        };
        if (item.includes(")")) {
          res.voice = item.substring(0, item.lastIndexOf(")") + 1).trim();
          res.code = item.substring(item.lastIndexOf(")") + 1, item.length).trim();
        } else {
          res.voice = item.substring(0, item.lastIndexOf(" ")).trim();
          res.code = item.substring(item.lastIndexOf(" "), item.length).trim();
        }
        return res;
      });
  } catch (error) {
    console.log(error);
  }
  return [];
}

function checkServiceNotSupportLang(
  service: TransServiceProviderTp,
  targetLang: ILangItem,
  queryText: string
): ITranslateRes | undefined {
  const langs = TRANS_SERVICES_NOT_SUPPORT_LANGS.get(service);
  if (!langs) return undefined;
  if (langs.includes(targetLang.langId))
    return {
      serviceProvider: service,
      code: TransAPIErrCode.NotSupport,
      from: getLang(""),
      to: targetLang,
      origin: queryText,
      res: "",
    };
  return undefined;
}

export async function capture(closeWindow: boolean): Promise<string> {
  let capturePath = path.join(os.tmpdir(), TempOCRImgName);
  closeWindow && (await closeMainWindow({ popToRootType: PopToRootType.Suspended }));
  closeWindow && (await showHUD("Capture the text you want to translate"));
  !closeWindow && (await showToast({ title: "Capture the text you want to translate" }));
  execSync(`/usr/sbin/screencapture -i  ${capturePath}`);
  const now = new Date().getTime();
  const stat = fs.statSync(capturePath);
  if (Math.abs(now - stat.ctimeMs) > 3000) {
    capturePath = "";
  }
  closeWindow && (await open("raycast://"));
  return capturePath;
}

export async function getTextFromPic(picPath: string): Promise<string> {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const ocrApi = apiOCRMap.get(preferences.ocrServiceProvider);
  if (!ocrApi) return "";
  return await ocrApi(picPath, getOCRServiceProvider());
}

export function checkOCRPreferences() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  let checkCfg = true;
  switch (preferences.ocrServiceProvider) {
    case OCRServiceProviderTp.Google:
      if (!preferences.googleOCRApiKey) checkCfg = false;
      break;
    case OCRServiceProviderTp.MicrosoftAzure:
      if (!preferences.microsoftOCRResourceName || !preferences.microsoftOCRAccessKey) checkCfg = false;
      break;
    case OCRServiceProviderTp.Youdao:
      if (!preferences.youdaoOCRAppId || !preferences.youdaoOCRAppKey) checkCfg = false;
      break;
    case OCRServiceProviderTp.Baidu:
      if (!preferences.baiduOCRApiKey || !preferences.baiduOCRSecretKey) checkCfg = false;
      break;
    case OCRServiceProviderTp.Tencent:
      if (!preferences.tencentOCRSecretId || !preferences.tencentOCRSecretKey) checkCfg = false;
      break;
  }
  if (!checkCfg) {
    return <OCRServiceProviderMiss service={preferences.ocrServiceProvider} />;
  }
  return null;
}

const apiOCRMap = new Map<OCRServiceProviderTp, (image: string, provider: IOCRServiceProvider) => Promise<string>>([
  [OCRServiceProviderTp.Space, fetchSpaceOCR],
  [OCRServiceProviderTp.Google, fetchGoogleOCR],
  [OCRServiceProviderTp.MicrosoftAzure, fetchMicrosoftAzureOCR],
  [OCRServiceProviderTp.Youdao, fetchYoudaoOCR],
  [OCRServiceProviderTp.Baidu, fetchBaiduOCR],
  [OCRServiceProviderTp.Tencent, fetchTencentOCR],
]);

export function getOCRServiceProvider(): IOCRServiceProvider {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  let serviceProvider: IOCRServiceProvider = { appId: "", appKey: "", serviceProvider: OCRServiceProviderTp.Space };
  switch (preferences.ocrServiceProvider) {
    case OCRServiceProviderTp.Space:
      serviceProvider = {
        appId: "",
        appKey: preferences.spaceOCRApiKey || BUILD_IN_SPACE_OCR_API_KEY,
        serviceProvider: OCRServiceProviderTp.Space,
      };
      break;
    case OCRServiceProviderTp.Google:
      serviceProvider = {
        appId: "",
        appKey: preferences.googleOCRApiKey,
        serviceProvider: OCRServiceProviderTp.Google,
      };
      break;
    case OCRServiceProviderTp.MicrosoftAzure:
      serviceProvider = {
        appId: preferences.microsoftOCRResourceName,
        appKey: preferences.microsoftOCRAccessKey,
        serviceProvider: OCRServiceProviderTp.MicrosoftAzure,
      };
      break;
    case OCRServiceProviderTp.Youdao:
      serviceProvider = {
        appId: preferences.youdaoOCRAppId,
        appKey: preferences.youdaoOCRAppKey,
        serviceProvider: OCRServiceProviderTp.Youdao,
      };
      break;
    case OCRServiceProviderTp.Baidu:
      serviceProvider = {
        appId: preferences.baiduOCRApiKey,
        appKey: preferences.baiduOCRSecretKey,
        serviceProvider: OCRServiceProviderTp.Baidu,
      };
      break;
    case OCRServiceProviderTp.Tencent:
      serviceProvider = {
        appId: preferences.tencentOCRSecretId,
        appKey: preferences.tencentOCRSecretKey,
        serviceProvider: OCRServiceProviderTp.Tencent,
      };
      break;
  }
  return serviceProvider;
}

function fetchSpaceOCR(image: string, provider: IOCRServiceProvider): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(image));
    axios({
      url: "https://api.ocr.space/parse/image",
      method: "POST",
      headers: { apikey: provider.appKey, ...formData.getHeaders() },
      data: formData,
    })
      .then((res) => {
        const resDate: ISpaceOCRResult = res.data;
        if (resDate.OCRExitCode != 1 || resDate.IsErroredOnProcessing) {
          reject(resDate.ErrorMessage);
        }
        resolve(resDate.ParsedResults.map((item) => item.ParsedText).join("\n"));
      })
      .catch(() => {
        reject("OCR failed");
      });
  });
}

function fetchGoogleOCR(image: string, provider: IOCRServiceProvider): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const APP_KEY = provider.appKey;
    axios({
      url: "https://vision.googleapis.com/v1/images:annotate?key=" + APP_KEY,
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      data: {
        requests: [
          {
            image: {
              content: fs.readFileSync(image).toString("base64"),
            },
            features: [
              {
                type: "TEXT_DETECTION",
              },
            ],
          },
        ],
      },
    })
      .then((res) => {
        const resDate: IGoogleOCRResult = res.data;
        resolve(resDate.responses.map((item) => item.fullTextAnnotation.text).join("\n"));
      })
      .catch(() => {
        reject("OCR failed");
      });
  });
}

function fetchMicrosoftAzureOCR(image: string, provider: IOCRServiceProvider): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const RESOURCE_NAME = provider.appId;
    const APP_KEY = provider.appKey;
    const formData = new FormData();
    formData.append("file", fs.createReadStream(image));
    axios({
      url: `https://${RESOURCE_NAME}.cognitiveservices.azure.com/vision/v3.2/ocr`,
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        "Ocp-Apim-Subscription-Key": APP_KEY,
        ...formData.getHeaders(),
      },
      data: formData,
    })
      .then((res) => {
        const resDate: IMicrosoftAzureOCRResult = res.data;
        resolve(
          resDate.regions
            .map((region) => region.lines.map((line) => line.words.map((word) => word.text).join(" ")).join("\n"))
            .join("\n")
        );
      })
      .catch(() => {
        reject("OCR failed");
      });
  });
}

async function fetchBaiduOCR(image: string, provider: IOCRServiceProvider): Promise<string> {
  const token = await fetchBaiduOCRToken(provider);
  return new Promise<string>((resolve, reject) => {
    axios({
      url: "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=" + token,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: querystring.stringify({
        image: fs.readFileSync(image).toString("base64"),
        language_type: "auto_detect",
      }),
    })
      .then((res) => {
        const resDate: IBaiduOCRResult = res.data;
        if (resDate.error_code) {
          reject(resDate.error_msg);
        }
        resolve(resDate.words_result.map((item) => item.words).join("\n"));
      })
      .catch(() => {
        reject("OCR failed");
      });
  });
}

function fetchYoudaoOCR(image: string, provider: IOCRServiceProvider): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    function truncate(q: string): string {
      const len = q.length;
      return len <= 20 ? q : q.substring(0, 10) + len + q.substring(len - 10, len);
    }
    const APP_ID = provider.appId;
    const APP_KEY = provider.appKey;

    const imgBase64 = fs.readFileSync(image).toString("base64");
    const sha256 = crypto.createHash("sha256");
    const timestamp = Math.round(new Date().getTime() / 1000);
    const salt = timestamp;
    const sha256Content = APP_ID + truncate(imgBase64) + salt + timestamp + APP_KEY;
    const sign = sha256.update(sha256Content).digest("hex");
    axios({
      url: "https://openapi.youdao.com/ocrapi",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: querystring.stringify({
        img: imgBase64,
        langType: "auto",
        detectType: 10012,
        imageType: 1,
        appKey: APP_ID,
        salt,
        sign,
        docType: "json",
        signType: "v3",
        curtime: timestamp,
      }),
    })
      .then((res) => {
        const resDate: IYoudaoOCRResult = res.data;
        if (resDate.errorCode != "0") {
          reject("");
        }
        resolve(resDate.Result.regions.map((region) => region.lines.map((line) => line.text).join("\n")).join("\n"));
      })
      .catch(() => {
        reject("OCR failed");
      });
  });
}

function fetchBaiduOCRToken(provider: IOCRServiceProvider): Promise<string> {
  return new Promise<string>((resolve) => {
    const token: IBaiduOCRAccessToken = JSON.parse(cache.get(BaiduOCRTokenCacheKey) || "{}");
    if (token.access_token) {
      if (new Date().getTime() < token.expires_at) {
        resolve(token.access_token);
      } else {
        cache.remove(BaiduOCRTokenCacheKey);
      }
    }
    const APP_ID = provider.appId;
    const APP_KEY = provider.appKey;
    axios
      .post(
        "https://aip.baidubce.com/oauth/2.0/token?" +
          querystring.stringify({
            grant_type: "client_credentials",
            client_id: APP_ID,
            client_secret: APP_KEY,
          }),
        {}
      )
      .then((res) => {
        const resDate: IBaiduOCRAccessToken = res.data;
        resDate.expires_at = new Date().getTime() + resDate.expires_in * 1000;
        cache.set(BaiduOCRTokenCacheKey, JSON.stringify(resDate));
        resolve(resDate.access_token);
      })
      .catch(() => {
        resolve("");
      });
  });
}

function fetchTencentOCR(image: string, provider: IOCRServiceProvider): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sha256(message: string, secret = "", encoding?: any) {
      const hmac = crypto.createHmac("sha256", secret);
      return hmac.update(message).digest(encoding);
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

    const SECRET_ID = provider.appId;
    const SECRET_KEY = provider.appKey;

    const endpoint = "ocr.tencentcloudapi.com";
    const service = "ocr";
    const region = "ap-shanghai";
    const action = "GeneralBasicOCR";
    const version = "2018-11-19";
    const timestamp = Math.trunc(new Date().getTime() / 1000);
    const date = getDate(timestamp);

    const signedHeaders = "content-type;host";

    const payload = {
      ImageBase64: fs.readFileSync(image).toString("base64"),
      LanguageType: "auto",
    };

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

    const algorithm = "TC3-HMAC-SHA256";
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
    axios
      .post(`https://${endpoint}`, payload, {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json; charset=utf-8",
          Host: endpoint,
          "X-TC-Action": action,
          "X-TC-Timestamp": timestamp.toString(),
          "X-TC-Version": version,
          "X-TC-Region": region,
        },
      })
      .then((res) => {
        const resDate: ITencentOCRResult = res.data;
        if (resDate.Response) {
          resolve(resDate.Response.TextDetections.map((item) => item.DetectedText).join("\n"));
        }
      })
      .catch(() => {
        reject("OCR failed");
      });
  });
}
