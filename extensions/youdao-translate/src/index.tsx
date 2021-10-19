import React, { useState, useEffect } from "react";
import {
  Icon,
  Color,
  Form,
  List,
  Detail,
  ActionPanel,
  CopyToClipboardAction,
  OpenInBrowserAction,
  getPreferenceValues,
  getSelectedText,
  useNavigation,
  render
} from "@raycast/api";
import fetch from "node-fetch";
import crypto from "crypto";
import qs from "querystring";

type translateResult = {
  translation?: Array<string>
  isWord: boolean
  basic?: { phonetic?: string, explains?: Array<string> }
  l: string
  web?: Array<translateWebResult>
  webdict?: { url: string }
  errorCode: string
}

type translateWebResult = {
  value: Array<string>
  key: string
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
    headers: { "Content-Type": "application/json" }
  });
}

function LanguageFormDDropdown(props: { id: string, title: string, language: string, set_language: React.Dispatch<React.SetStateAction<string>> }) {
  const { id, title, language, set_language } = props;

  return <Form.Dropdown id={id} title={title} value={language} onChange={set_language}>
    <Form.Dropdown.Section title="Auto">
      <Form.Dropdown.Item value="auto" title="Auto choose language(自动选取)" />
    </Form.Dropdown.Section>
    <Form.Dropdown.Section title="Language">
      <Form.Dropdown.Item title="Chinese(中文)" value="zh-CHS" />
      <Form.Dropdown.Item title="English(英文)" value="en" />
      <Form.Dropdown.Item title="Japanese(日文)" value="ja" />
      <Form.Dropdown.Item title="Korean(韩文)" value="ko" />
      <Form.Dropdown.Item title="French(法文)" value="fr" />
      <Form.Dropdown.Item title="Spanish(西班牙文)" value="es" />
      <Form.Dropdown.Item title="Portuguese(葡萄牙文)" value="pt" />
      <Form.Dropdown.Item title="Italian(意大利文)" value="it" />
      <Form.Dropdown.Item title="Russian(俄文)" value="ru" />
      <Form.Dropdown.Item title="Vietnamese(越南文)" value="vi" />
      <Form.Dropdown.Item title="German(德文)" value="de" />
      <Form.Dropdown.Item title="Arabic(阿拉伯文)" value="ar" />
      <Form.Dropdown.Item title="Indonesian(印尼文)" value="id" />
      <Form.Dropdown.Item title="Afrikaans(南非荷兰语)" value="af" />
      <Form.Dropdown.Item title="Bosnian(波斯尼亚语)" value="bs" />
      <Form.Dropdown.Item title="Bulgarian(保加利亚语)" value="bg" />
      <Form.Dropdown.Item title="Cantonese(粤语)" value="yue" />
      <Form.Dropdown.Item title=" Catalan(加泰隆语)" value="ca" />
      <Form.Dropdown.Item title="Croatian(克罗地亚语)" value="hr" />
      <Form.Dropdown.Item title="Czech(捷克语)" value="cs" />
      <Form.Dropdown.Item title="Danish(丹麦语)" value="da" />
      <Form.Dropdown.Item title="Dutch(荷兰语)" value="nl" />
      <Form.Dropdown.Item title="Estonian(爱沙尼亚语)" value="et" />
      <Form.Dropdown.Item title="Fijian(斐济语)" value="fj" />
      <Form.Dropdown.Item title="Finnish(芬兰语)" value="fi" />
      <Form.Dropdown.Item title="Greek(希腊语)" value="el" />
      <Form.Dropdown.Item title="Haitian Creole(海地克里奥尔语)" value="ht" />
      <Form.Dropdown.Item title="Hebrew(希伯来语)" value="he" />
      <Form.Dropdown.Item title="Hindi(印地语)" value="hi" />
      <Form.Dropdown.Item title="Hungarian(匈牙利语)" value="hu" />
      <Form.Dropdown.Item title="Swahili(斯瓦希里语)" value="sw" />
      <Form.Dropdown.Item title="Latvian(拉脱维亚语)" value="lv" />
      <Form.Dropdown.Item title="Lithuanian(立陶宛语)" value="lt" />
      <Form.Dropdown.Item title="Malay(马来语)" value="ms" />
      <Form.Dropdown.Item title="Maltese(马耳他语)" value="mt" />
      <Form.Dropdown.Item title="Norwegian(挪威语)" value="no" />
      <Form.Dropdown.Item title="Persian(波斯语)" value="fa" />
      <Form.Dropdown.Item title="Polish(波兰语)" value="pl" />
      <Form.Dropdown.Item title="Romanian(罗马尼亚语)" value="ro" />
      <Form.Dropdown.Item title="Slovak(斯洛伐克语)" value="sk" />
      <Form.Dropdown.Item title="Slovenian(斯洛文尼亚语)" value="sl" />
      <Form.Dropdown.Item title="Swedish(瑞典语)" value="sv" />
      <Form.Dropdown.Item title="Tahitian(塔希提语)" value="ty" />
      <Form.Dropdown.Item title="Thai(泰语)" value="th" />
      <Form.Dropdown.Item title="Tongan(汤加语)" value="to" />
      <Form.Dropdown.Item title="Turkish(土耳其语)" value="tr" />
      <Form.Dropdown.Item title="Ukrainian(乌克兰语)" value="uk" />
      <Form.Dropdown.Item title="Urdu(乌尔都语)" value="ur" />
      <Form.Dropdown.Item title="Welsh(威尔士语)" value="cy" />
      <Form.Dropdown.Item title="Albanian(阿尔巴尼亚语)" value="sq" />
      <Form.Dropdown.Item title="Amharic(阿姆哈拉语)" value="am" />
      <Form.Dropdown.Item title="Armenian(亚美尼亚语)" value="hy" />
      <Form.Dropdown.Item title="Azerbaijani(阿塞拜疆语)" value="az" />
      <Form.Dropdown.Item title="Bengali(孟加拉语)" value="bn" />
      <Form.Dropdown.Item title="Basque(巴斯克语)" value="eu" />
      <Form.Dropdown.Item title="Belarusian(白俄罗斯语)" value="be" />
      <Form.Dropdown.Item title="Corsican(科西嘉语)" value="co" />
      <Form.Dropdown.Item title="Esperanto(世界语)" value="eo" />
      <Form.Dropdown.Item title="Filipino(菲律宾语)" value="tl" />
      <Form.Dropdown.Item title="Frisian(弗里西语)" value="fy" />
      <Form.Dropdown.Item title="Galician(加利西亚语)" value="gl" />
      <Form.Dropdown.Item title="Georgian(格鲁吉亚语)" value="ka" />
      <Form.Dropdown.Item title="Gujarati(古吉拉特语)" value="gu" />
      <Form.Dropdown.Item title="Hausa(豪萨语)" value="ha" />
      <Form.Dropdown.Item title="Icelandic(冰岛语)" value="is" />
      <Form.Dropdown.Item title="Igbo(伊博语)" value="ig" />
      <Form.Dropdown.Item title="Irish(爱尔兰语)" value="ga" />
      <Form.Dropdown.Item title="Javanese(爪哇语)" value="jw" />
      <Form.Dropdown.Item title="Kannada(卡纳达语)" value="kn" />
      <Form.Dropdown.Item title="Kazakh(哈萨克语)" value="kk" />
      <Form.Dropdown.Item title="Cambodian(高棉语)" value="km" />
      <Form.Dropdown.Item title="Kurdish(库尔德语)" value="ku" />
      <Form.Dropdown.Item title="Kirgiz(柯尔克孜语)" value="ky" />
      <Form.Dropdown.Item title="Lao(老挝语)" value="lo" />
      <Form.Dropdown.Item title="Latin(拉丁语)" value="la" />
      <Form.Dropdown.Item title="Luxembourgish(卢森堡语)" value="lb" />
      <Form.Dropdown.Item title="Macedonian(马其顿语)" value="mk" />
      <Form.Dropdown.Item title="Malagasy(马尔加什语)" value="mg" />
      <Form.Dropdown.Item title="Malayalam(马拉雅拉姆语)" value="ml" />
      <Form.Dropdown.Item title="Maori(毛利语)" value="mi" />
      <Form.Dropdown.Item title="Marathi(马拉地语)" value="mr" />
      <Form.Dropdown.Item title="Mongolian(蒙古语)" value="mn" />
      <Form.Dropdown.Item title="Burmese(缅甸语)" value="my" />
      <Form.Dropdown.Item title="Nepali(尼泊尔语)" value="ne" />
      <Form.Dropdown.Item title="Chichewa(齐切瓦语)" value="ny" />
      <Form.Dropdown.Item title="Pashto(普什图语)" value="ps" />
      <Form.Dropdown.Item title="Punjabi(旁遮普语)" value="pa" />
      <Form.Dropdown.Item title="Samoan(萨摩亚语)" value="sm" />
      <Form.Dropdown.Item title="Scottish Gaelic(苏格兰盖尔语)" value="gd" />
      <Form.Dropdown.Item title="Sesotho(塞索托语)" value="st" />
      <Form.Dropdown.Item title="Shona(修纳语)" value="sn" />
      <Form.Dropdown.Item title="Sindhi(信德语)" value="sd" />
      <Form.Dropdown.Item title="Sinhala(僧伽罗语)" value="si" />
      <Form.Dropdown.Item title="Somali(索马里语)" value="so" />
      <Form.Dropdown.Item title="Sundanese(巽他语)" value="su" />
      <Form.Dropdown.Item title="Tajik(塔吉克语)" value="tg" />
      <Form.Dropdown.Item title="Tamil(泰米尔语)" value="ta" />
      <Form.Dropdown.Item title="Telugu(泰卢固语)" value="te" />
      <Form.Dropdown.Item title="Uzbek(乌兹别克语)" value="uz" />
      <Form.Dropdown.Item title="South African Xhosa(南非科萨语)" value="xh" />
      <Form.Dropdown.Item title="Yiddish(意第绪语)" value="yi" />
      <Form.Dropdown.Item title="Yoruba(约鲁巴语)" value="yo" />
      <Form.Dropdown.Item title="Zulu, South Africa(南非祖鲁语)" value="zu" />
      <Form.Dropdown.Item title="Hawaiian(夏威夷语)" value="haw" />
      <Form.Dropdown.Item title="Cebuano(宿务语)" value="ceb" />
      <Form.Dropdown.Item title="Yucatan Maya(尤卡坦玛雅语)" value="yua" />
      <Form.Dropdown.Item title="Serbian-Cyrillic(塞尔维亚语-西里尔文)" value="sr-Cyrl" />
      <Form.Dropdown.Item title="Serbian-Latin(塞尔维亚语-拉丁文)" value="sr-Latn" />
      <Form.Dropdown.Item title="Queretaro Otomi(克雷塔罗奥托米语)" value="otq" />
      <Form.Dropdown.Item title="Klingon(克林贡语)" value="tlh" />
      <Form.Dropdown.Item title="Bai Hmong(白苗语)" value="mww" />
    </Form.Dropdown.Section>
  </Form.Dropdown>;
}

function TranslateResultActionPanel(props: { copy_content: string, url: string | undefined }) {
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
      ${error_message}
      `;
  const { pop } = useNavigation();
  return <Detail markdown={errorMessage} actions={
    <ActionPanel>
      <ActionPanel.Item title="Back To Form" onAction={pop} />
    </ActionPanel>} />;
}

function Translate(props: { content: string | undefined; from_language: string; to_language: string; }) {
  const [translate_result, set_translate_result] = useState<translateResult>({
    basic: {},
    isWord: false,
    l: "",
    translation: undefined,
    web: undefined,
    webdict: { url: "" },
    errorCode: ""
  });

  const { content, from_language, to_language } = props;

  if (content === "" || content === undefined) {
    return <ErrorMessage error_message="- Content can not be blank" />;
  }
  useEffect(() => {
    (async () => {
      const response = await translateAPI(content, from_language, to_language);
      set_translate_result(await response.json());
    })();
  }, []);

  if (translate_result && translate_result.errorCode && translate_result.errorCode !== "0") {
    const errorMessage = `
      - error code: ${translate_result.errorCode}.
      - you can find all error code in here. (https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html)`;
    return <ErrorMessage error_message={errorMessage} />;
  }

  return <List navigationTitle="Youdao Translate Result (翻译结果)" isLoading={translate_result.errorCode === ""}>
    {translate_result.translation ?
      <List.Section title="Translate" subtitle="翻译">
        {translate_result.translation.map(
          (item: string, index: number) => (
            <List.Item key={index} title={item} icon={{ source: Icon.Dot, tintColor: Color.Red }} actions={
              <TranslateResultActionPanel copy_content={item}
                                          url={translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined} />
            } />
          )
        )}
      </List.Section> : null}
    {translate_result.basic && translate_result.basic.explains && translate_result.basic.explains.length > 0 ?
      <List.Section title="Detail" subtitle="详细释义">
        {translate_result.basic.explains.map(
          (item: string, index: number) => (
            <List.Item key={index} title={item} icon={{ source: Icon.Dot, tintColor: Color.Blue }} actions={
              <TranslateResultActionPanel copy_content={item}
                                          url={translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined} />
            } />
          )
        )}
      </List.Section> : null}
    {translate_result.web && translate_result.web.length > 0 ?
      <List.Section title="Web Translate" subtitle="网络释义">
        {(translate_result.web).map(
          (item: translateWebResult, index: number) => (
            <List.Item key={index} title={item.value.join(", ")} icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
                       subtitle={item.key} actions={
              <TranslateResultActionPanel copy_content={item.value.join(", ")}
                                          url={translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined} />
            }
            />
          )
        )}
      </List.Section> : null}
  </List>;
}

function Main() {
  const [input, set_input] = useState<string>();
  const [select, set_select] = useState<string>();
  const [from_language, set_from_language] = useState<string>("auto");
  const [to_language, set_to_language] = useState<string>("auto");

  const { push } = useNavigation();
  useEffect(() => {
    (async () => {
      try {
        const selected_text = await getSelectedText();
        set_select(selected_text);
      } catch (e) {
        set_select("");
      }
    })();
  }, []);

  return (
    <Form navigationTitle="Please enter what you want translated (输入内容)" actions={
      <ActionPanel title="Translate">
        <ActionPanel.Item title="Translate" onAction={() => push(
          <Translate content={input || select} to_language={to_language} from_language={from_language} />
        )} />
      </ActionPanel>
    }>
      <Form.TextArea title="Content(内容)" id="content" value={input} onChange={set_input}
                     placeholder={select !== "" ? `you selected ${select}` : "please enter content"} />
      <Form.Separator />
      <LanguageFormDDropdown id="from" title="From(源语言)" language={from_language} set_language={set_from_language} />
      <LanguageFormDDropdown id="to" title="To(目标语言)" language={to_language} set_language={set_to_language} />
    </Form>
  );
}

render(<Main />);
