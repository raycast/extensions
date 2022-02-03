import { useState, useEffect } from "react";
import {
  Icon,
  Color,
  Form,
  List,
  Detail,
  ActionPanel,
  CopyToClipboardAction,
  OpenInBrowserAction,
  SubmitFormAction,
  getPreferenceValues,
  useNavigation,
  render,
} from "@raycast/api";
import fetch from "node-fetch";
import crypto from "crypto";
import qs from "querystring";

interface translateResult {
  translation?: Array<string>;
  isWord: boolean;
  basic?: { phonetic?: string; explains?: Array<string> };
  l: string;
  web?: Array<translateWebResult>;
  webdict?: { url: string };
  errorCode: string;
}

interface translateWebResult {
  value: Array<string>;
  key: string;
}

interface translateRequest {
  content: string;
  from_language: string;
  to_language: string;
}

function generateSign(content: string, salt: number, app_key: string, app_secret: string) {
  const md5 = crypto.createHash("md5");
  md5.update(app_key + content + salt + app_secret);
  const cipher = md5.digest("hex");
  return cipher.slice(0, 32).toUpperCase();
}

function translateAPI(content: string, from_language: string, to_language: string) {
  const { app_key, app_secret } = getPreferenceValues();
  const q = Buffer.from(content).toString();
  const salt = Date.now();
  const sign = generateSign(q, salt, app_key, app_secret);
  const query = qs.stringify({ q: q, appKey: app_key, from: from_language, to: to_language, salt, sign });
  return fetch(`https://openapi.youdao.com/api?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

function LanguageFormDDropdown(props: { id: string; title: string }) {
  const { id, title } = props;

  return (
    <Form.Dropdown id={id} title={title} defaultValue="auto">
      <Form.Dropdown.Section title="Auto">
        <Form.Dropdown.Item value="auto" title="Auto choose language" />
      </Form.Dropdown.Section>
      <Form.Dropdown.Section title="Language">
        <Form.Dropdown.Item title="Chinese" value="zh-CHS" />
        <Form.Dropdown.Item title="English" value="en" />
        <Form.Dropdown.Item title="Japanese" value="ja" />
        <Form.Dropdown.Item title="Korean" value="ko" />
        <Form.Dropdown.Item title="French" value="fr" />
        <Form.Dropdown.Item title="Spanish" value="es" />
        <Form.Dropdown.Item title="Portuguese" value="pt" />
        <Form.Dropdown.Item title="Italian" value="it" />
        <Form.Dropdown.Item title="Russian" value="ru" />
        <Form.Dropdown.Item title="Vietnamese" value="vi" />
        <Form.Dropdown.Item title="German" value="de" />
        <Form.Dropdown.Item title="Arabic" value="ar" />
        <Form.Dropdown.Item title="Indonesian" value="id" />
        <Form.Dropdown.Item title="Afrikaans" value="af" />
        <Form.Dropdown.Item title="Bosnian" value="bs" />
        <Form.Dropdown.Item title="Bulgarian" value="bg" />
        <Form.Dropdown.Item title="Cantonese" value="yue" />
        <Form.Dropdown.Item title=" Catalan" value="ca" />
        <Form.Dropdown.Item title="Croatian" value="hr" />
        <Form.Dropdown.Item title="Czech" value="cs" />
        <Form.Dropdown.Item title="Danish" value="da" />
        <Form.Dropdown.Item title="Dutch" value="nl" />
        <Form.Dropdown.Item title="Estonian" value="et" />
        <Form.Dropdown.Item title="Fijian" value="fj" />
        <Form.Dropdown.Item title="Finnish" value="fi" />
        <Form.Dropdown.Item title="Greek" value="el" />
        <Form.Dropdown.Item title="Haitian Creole" value="ht" />
        <Form.Dropdown.Item title="Hebrew" value="he" />
        <Form.Dropdown.Item title="Hindi" value="hi" />
        <Form.Dropdown.Item title="Hungarian" value="hu" />
        <Form.Dropdown.Item title="Swahili" value="sw" />
        <Form.Dropdown.Item title="Latvian" value="lv" />
        <Form.Dropdown.Item title="Lithuanian" value="lt" />
        <Form.Dropdown.Item title="Malay" value="ms" />
        <Form.Dropdown.Item title="Maltese" value="mt" />
        <Form.Dropdown.Item title="Norwegian" value="no" />
        <Form.Dropdown.Item title="Persian" value="fa" />
        <Form.Dropdown.Item title="Polish" value="pl" />
        <Form.Dropdown.Item title="Romanian" value="ro" />
        <Form.Dropdown.Item title="Slovak" value="sk" />
        <Form.Dropdown.Item title="Slovenian" value="sl" />
        <Form.Dropdown.Item title="Swedish" value="sv" />
        <Form.Dropdown.Item title="Tahitian" value="ty" />
        <Form.Dropdown.Item title="Thai" value="th" />
        <Form.Dropdown.Item title="Tongan" value="to" />
        <Form.Dropdown.Item title="Turkish" value="tr" />
        <Form.Dropdown.Item title="Ukrainian" value="uk" />
        <Form.Dropdown.Item title="Urdu" value="ur" />
        <Form.Dropdown.Item title="Welsh" value="cy" />
        <Form.Dropdown.Item title="Albanian" value="sq" />
        <Form.Dropdown.Item title="Amharic" value="am" />
        <Form.Dropdown.Item title="Armenian" value="hy" />
        <Form.Dropdown.Item title="Azerbaijani" value="az" />
        <Form.Dropdown.Item title="Bengali" value="bn" />
        <Form.Dropdown.Item title="Basque" value="eu" />
        <Form.Dropdown.Item title="Belarusian" value="be" />
        <Form.Dropdown.Item title="Corsican" value="co" />
        <Form.Dropdown.Item title="Esperanto" value="eo" />
        <Form.Dropdown.Item title="Filipino" value="tl" />
        <Form.Dropdown.Item title="Frisian" value="fy" />
        <Form.Dropdown.Item title="Galician" value="gl" />
        <Form.Dropdown.Item title="Georgian" value="ka" />
        <Form.Dropdown.Item title="Gujarati" value="gu" />
        <Form.Dropdown.Item title="Hausa" value="ha" />
        <Form.Dropdown.Item title="Icelandic" value="is" />
        <Form.Dropdown.Item title="Igbo" value="ig" />
        <Form.Dropdown.Item title="Irish" value="ga" />
        <Form.Dropdown.Item title="Javanese" value="jw" />
        <Form.Dropdown.Item title="Kannada" value="kn" />
        <Form.Dropdown.Item title="Kazakh" value="kk" />
        <Form.Dropdown.Item title="Cambodian" value="km" />
        <Form.Dropdown.Item title="Kurdish" value="ku" />
        <Form.Dropdown.Item title="Kirgiz" value="ky" />
        <Form.Dropdown.Item title="Lao" value="lo" />
        <Form.Dropdown.Item title="Latin" value="la" />
        <Form.Dropdown.Item title="Luxembourgish" value="lb" />
        <Form.Dropdown.Item title="Macedonian" value="mk" />
        <Form.Dropdown.Item title="Malagasy" value="mg" />
        <Form.Dropdown.Item title="Malayalam" value="ml" />
        <Form.Dropdown.Item title="Maori" value="mi" />
        <Form.Dropdown.Item title="Marathi" value="mr" />
        <Form.Dropdown.Item title="Mongolian" value="mn" />
        <Form.Dropdown.Item title="Burmese" value="my" />
        <Form.Dropdown.Item title="Nepali" value="ne" />
        <Form.Dropdown.Item title="Chichewa" value="ny" />
        <Form.Dropdown.Item title="Pashto" value="ps" />
        <Form.Dropdown.Item title="Punjabi" value="pa" />
        <Form.Dropdown.Item title="Samoan" value="sm" />
        <Form.Dropdown.Item title="Scottish Gaelic" value="gd" />
        <Form.Dropdown.Item title="Sesotho" value="st" />
        <Form.Dropdown.Item title="Shona" value="sn" />
        <Form.Dropdown.Item title="Sindhi" value="sd" />
        <Form.Dropdown.Item title="Sinhala" value="si" />
        <Form.Dropdown.Item title="Somali" value="so" />
        <Form.Dropdown.Item title="Sundanese" value="su" />
        <Form.Dropdown.Item title="Tajik" value="tg" />
        <Form.Dropdown.Item title="Tamil" value="ta" />
        <Form.Dropdown.Item title="Telugu" value="te" />
        <Form.Dropdown.Item title="Uzbek" value="uz" />
        <Form.Dropdown.Item title="South African Xhosa" value="xh" />
        <Form.Dropdown.Item title="Yiddish" value="yi" />
        <Form.Dropdown.Item title="Yoruba" value="yo" />
        <Form.Dropdown.Item title="Zulu, South Africa" value="zu" />
        <Form.Dropdown.Item title="Hawaiian" value="haw" />
        <Form.Dropdown.Item title="Cebuano" value="ceb" />
        <Form.Dropdown.Item title="Yucatan Maya" value="yua" />
        <Form.Dropdown.Item title="Serbian-Cyrillic" value="sr-Cyrl" />
        <Form.Dropdown.Item title="Serbian-Latin" value="sr-Latn" />
        <Form.Dropdown.Item title="Queretaro Otomi" value="otq" />
        <Form.Dropdown.Item title="Klingon" value="tlh" />
        <Form.Dropdown.Item title="Bai Hmong" value="mww" />
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}

function TranslateResultActionPanel(props: { copy_content: string; url: string | undefined }) {
  const { copy_content, url } = props;
  return (
    <ActionPanel>
      <CopyToClipboardAction content={copy_content} />
      {url ? <OpenInBrowserAction url={url} /> : null}
    </ActionPanel>
  );
}

function ErrorMessage(props: { error_message: string }) {
  const { error_message } = props;
  const errorMessage = `### ERROR
${error_message}`;
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={errorMessage}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Back To Form" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function Translate(props: { content: string | undefined; from_language: string; to_language: string }) {
  const [translate_result, set_translate_result] = useState<translateResult>({
    basic: {},
    isWord: false,
    l: "",
    translation: undefined,
    web: undefined,
    webdict: { url: "" },
    errorCode: "",
  });

  const { content, from_language, to_language } = props;

  if (content === "" || content === undefined) {
    const errorMessage = `
* Content can not be blank`;
    return <ErrorMessage error_message={errorMessage} />;
  }
  useEffect(() => {
    (async () => {
      const response = await translateAPI(content, from_language, to_language);
      set_translate_result(await response.json());
    })();
  }, []);

  if (translate_result && translate_result.errorCode && translate_result.errorCode !== "0") {
    const errorMessage = `
* error code: ${translate_result.errorCode}.
* you can find all error code in here. (https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html)`;
    return <ErrorMessage error_message={errorMessage} />;
  }
  if (content.split(" ").length == 1) {
    return (
      <List isLoading={translate_result.errorCode === "" && translate_result.isWord}>
        {translate_result.translation ? (
          <List.Section title="Translate">
            {translate_result.translation.map((item: string, index: number) => (
              <List.Item
                key={index}
                title={item}
                icon={{ source: Icon.Dot, tintColor: Color.Red }}
                actions={
                  <TranslateResultActionPanel
                    copy_content={item}
                    url={
                      translate_result.webdict && translate_result.webdict.url
                        ? translate_result.webdict.url
                        : undefined
                    }
                  />
                }
              />
            ))}
          </List.Section>
        ) : null}
        {translate_result.basic && translate_result.basic.explains && translate_result.basic.explains.length > 0 ? (
          <List.Section title="Detail">
            {translate_result.basic.explains.map((item: string, index: number) => (
              <List.Item
                key={index}
                title={item}
                icon={{ source: Icon.Dot, tintColor: Color.Blue }}
                actions={
                  <TranslateResultActionPanel
                    copy_content={item}
                    url={
                      translate_result.webdict && translate_result.webdict.url
                        ? translate_result.webdict.url
                        : undefined
                    }
                  />
                }
              />
            ))}
          </List.Section>
        ) : null}
        {translate_result.web && translate_result.web.length > 0 ? (
          <List.Section title="Web Translate">
            {translate_result.web.map((item: translateWebResult, index: number) => (
              <List.Item
                key={index}
                title={item.value.join(", ")}
                icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
                subtitle={item.key}
                actions={
                  <TranslateResultActionPanel
                    copy_content={item.value.join(", ")}
                    url={
                      translate_result.webdict && translate_result.webdict.url
                        ? translate_result.webdict.url
                        : undefined
                    }
                  />
                }
              />
            ))}
          </List.Section>
        ) : null}
      </List>
    );
  } else {
    let result = "";
    translate_result.translation?.forEach((value) => {
      result += `* ${value}`;
    });
    return (
      <Detail
        isLoading={translate_result.errorCode === "" && !translate_result.isWord}
        markdown={result}
        actions={
          <TranslateResultActionPanel
            copy_content={result}
            url={translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined}
          />
        }
      />
    );
  }
}

function Main() {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel title="Translate">
          <SubmitFormAction
            title="Translate"
            onSubmit={(input: translateRequest) => {
              push(
                <Translate
                  content={input.content}
                  to_language={input.to_language}
                  from_language={input.from_language}
                />
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" id="content" placeholder="Text to translate" />
      <Form.Separator />
      <LanguageFormDDropdown id="from_language" title="From" />
      <LanguageFormDDropdown id="to_language" title="To" />
    </Form>
  );
}

render(<Main />);
