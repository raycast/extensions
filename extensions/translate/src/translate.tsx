import crypto from "crypto";
import { useEffect, useState, useMemo } from "react";
import fetch from "node-fetch";
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";

interface translateWebResult {
  value: Array<string>;
  key: string;
}

interface translateResult {
  translation?: Array<string>;
  isWord: boolean;
  basic?: { phonetic?: string; explains?: Array<string> };
  l: string;
  web?: Array<translateWebResult>;
  webdict?: { url: string };
  errorCode: string;
}

function getTranslateUrl(params: { q: string; appKey: string; from: string; to: string; salt: string; sign: string }) {
  return `https://openapi.youdao.com/api?${new URLSearchParams(params).toString()}`;
}

function generateSign(content: string, salt: number, app_key: string, app_secret: string) {
  const md5 = crypto.createHash("md5");
  md5.update(app_key + content + salt + app_secret);
  const cipher = md5.digest("hex");
  return cipher.slice(0, 32).toUpperCase();
}

function handleContent(content: string, handle_annotation: boolean) {
  const annotations = ["///", "//!", "/*", "*/", "//"];
  if (handle_annotation) {
    for (const annotation of annotations) {
      while (content.includes(annotation)) content = content.replace(annotation, "");
    }
  }

  while (content.includes("\r")) content = content.replace("\r", "");

  const contentList = content.split("\n");
  for (const i in contentList) {
    contentList[i] = contentList[i].trim();
    if (contentList[i] === "") contentList[i] = "\n\n";
  }
  content = contentList.join(" ");
  return content;
}

function translateAPI(content: string, from_language: string, to_language: string) {
  const { app_key, app_secret, handle_annotation } = getPreferenceValues();
  const q = Buffer.from(handleContent(content, handle_annotation)).toString();
  const salt = Date.now();
  const sign = generateSign(q, salt, app_key, app_secret);

  const url = getTranslateUrl({
    q,
    appKey: app_key,
    from: from_language,
    to: to_language,
    salt: String(salt),
    sign,
  });

  return fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function TranslateResultActionPanel(props: { copyContent: string; url: string | undefined }) {
  const { copyContent, url } = props;
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={copyContent} />
      {url ? <Action.OpenInBrowser url={url} /> : null}
    </ActionPanel>
  );
}

const defaultTranslateResult: translateResult = {
  basic: {},
  isWord: false,
  l: "",
  translation: undefined,
  web: undefined,
  webdict: { url: "" },
  errorCode: "",
};

export default function Command() {
  const [isLoading, setLoadingStatus] = useState(false);
  const [toTranslate, setToTranslate] = useState("");
  const [{ basic, translation, web, webdict }, setTranslateResult] = useState(defaultTranslateResult);

  useEffect(() => {
    if (toTranslate === "") return;

    setLoadingStatus(true);

    (async () => {
      const response = await translateAPI(toTranslate, "auto", "auto");
      setTranslateResult(((await response.json()) as translateResult) || {});
      setLoadingStatus(false);
    })();
  }, [toTranslate]);

  const actionPanelUrl = useMemo(() => {
    return webdict?.url || "";
  }, [webdict?.url]);

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      onSearchTextChange={setToTranslate}
      isLoading={isLoading}
      throttle
    >
      {translation?.map((item, index) => (
        <List.Item
          key={index}
          title={item}
          icon={{ source: Icon.Dot, tintColor: Color.Red }}
          actions={<TranslateResultActionPanel copyContent={item} url={actionPanelUrl} />}
        />
      ))}
      {basic?.explains?.map((item, index) => (
        <List.Item
          key={index}
          title={item}
          icon={{ source: Icon.Dot, tintColor: Color.Blue }}
          actions={<TranslateResultActionPanel copyContent={item} url={actionPanelUrl} />}
        />
      ))}
      {web?.map((item, index) => (
        <List.Item
          key={index}
          title={item.value.join(", ")}
          icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
          subtitle={item.key}
          actions={<TranslateResultActionPanel copyContent={item.value.join(", ")} url={actionPanelUrl} />}
        />
      ))}
    </List>
  );
}
