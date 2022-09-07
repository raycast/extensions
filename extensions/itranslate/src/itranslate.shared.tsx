import { Cache, getPreferenceValues } from "@raycast/api";
import { HistoriesCacheKey, LANG_LIST, TransAPIErrCode, TransServiceProviderTp } from "./const";
import axios from "axios";
import crypto from "crypto";
import querystring from "node:querystring";
import { LanguageConflict, ServiceProviderMiss } from "./TranslateError";
import translate from "@vitalets/google-translate-api";
import Core from "@alicloud/pop-core";
import { execSync } from "child_process";

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
  let checkService = true;
  switch (preferences.defaultServiceProvider) {
    case TransServiceProviderTp.Google:
      checkService = true;
      break;
    case TransServiceProviderTp.GoogleCouldTrans:
      if (!preferences.googleApiKey) checkService = false;
      break;
    case TransServiceProviderTp.DeepL:
      if (!preferences.deeplAuthKey) checkService = false;
      break;
    case TransServiceProviderTp.MicrosoftAzure:
      if (!preferences.microsoftAccessKey) checkService = false;
      break;
    case TransServiceProviderTp.Baidu:
      if (!preferences.baiduAppId || !preferences.baiduAppKey) checkService = false;
      break;
    case TransServiceProviderTp.Youdao:
      if (!preferences.youdaoAppId || !preferences.youdaoAppKey) checkService = false;
      break;
    case TransServiceProviderTp.Tencent:
      if (!preferences.tencentAppId || !preferences.tencentAppKey) checkService = false;
      break;
    case TransServiceProviderTp.Aliyun:
      if (!preferences.aliyunAccessKeyId || !preferences.aliyunAccessKeySecret) checkService = false;
      break;
  }
  if (!checkService) {
    return <ServiceProviderMiss />;
  }

  return null;
}

export function getLang(value: string): ILangItem {
  return (
    LANG_LIST.find((lang) =>
      [
        lang.langId,
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

export function getServiceProviderMap(): Map<TransServiceProviderTp, ITransServiceProvider> {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const serviceProviderMap = new Map<TransServiceProviderTp, ITransServiceProvider>([]);
  switch (preferences.defaultServiceProvider) {
    case TransServiceProviderTp.Google:
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
  if (preferences.defaultServiceProvider != TransServiceProviderTp.Google) {
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
    const fromLang = "auto";
    const APP_KEY = provider.appKey;
    axios
      .post(
        `https://translation.googleapis.com/language/translate/v2?` +
          querystring.stringify({
            key: APP_KEY,
            q: queryText,
            format: "text",
            target: targetLang.langId,
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
    const fromLang = "auto";
    const preferences: IPreferences = getPreferenceValues<IPreferences>();
    translate(queryText, { to: targetLang.langId, from: fromLang, tld: preferences.googleFreeTLD })
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

  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  if (provider.serviceProvider === preferences.defaultServiceProvider) {
    try {
      const from = await client.request<IAliyunDetectLangResponse>(
        "GetDetectLanguage",
        { SourceText: queryText },
        { method: "POST" }
      );
      fromLang = from.DetectedLanguage;
    } catch {
      console.log("GetDetectLanguage err");
    }
  }
  return new Promise<ITranslateRes>((resolve) => {
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

const cache = new Cache();

export function getHistories(): TransHistory[] {
  return JSON.parse(cache.get(HistoriesCacheKey) || "[]");
}

export function saveHistory(history: TransHistory, limit: number) {
  const historiesCache: TransHistory[] = JSON.parse(cache.get(HistoriesCacheKey) || "[]");
  if (historiesCache.unshift(history) > limit) historiesCache.pop();
  cache.set(HistoriesCacheKey, JSON.stringify(historiesCache));
}

export function clearAllHistory() {
  cache.remove(HistoriesCacheKey);
}

export function say(text: string, lang: ILangItem) {
  if (!lang.voice) return;
  try {
    const command = `say -v ${lang.voice} "${text.replace(/"/g, " ")}"`;
    execSync(command);
  } catch (error) {
    console.log(error);
  }
}
