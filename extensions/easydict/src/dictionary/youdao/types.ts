/*
 * @author: tisfeng
 * @createTime: 2022-08-04 23:21
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-17 09:49
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { DetectedLangModel } from "../../detectLanguage/types";

export interface YoudaoDictionaryFormatResult {
  queryWordInfo: QueryWordInfo;
  translation: string;
  explanations?: ExplanationItem[];
  forms?: WordForms[];
  webTranslation?: KeyValueItem;
  webPhrases?: KeyValueItem[];
  baike?: BaikeSummary;
  wikipedia?: BaikeSummary;
  modernChineseDict?: ModernChineseDataList[];
}

export enum YoudaoDictionaryListItemType {
  Translation = "Translation",
  Explanation = "Explanation",
  ModernChineseDict = "Modern Chinese Dict",
  Forms = "Forms and Tenses",
  WebTranslation = "Web Translation",
  WebPhrase = "Web Phrase",
  Baike = "Baike",
  Wikipedia = "Wikipedia",
}

export interface YoudaoDictionaryResult {
  l: string;
  query: string;
  returnPhrase: [];
  errorCode: string;
  translation: string[]; // ! do not change property name! current only has one translation.
  web?: KeyValueItem[];
  basic?: YoudaoTranslateResultBasicItem;
  isWord: boolean;
  speakUrl: string;
}

export type YoudaoTranslateResult = YoudaoDictionaryResult;

export interface QueryWordInfo {
  word: string;
  fromLanguage: string; // ! must be Youdao language id.
  toLanguage: string;
  isWord?: boolean; // * Dictionary Type should has value, show web url need this value.
  hasDictionaryEntries?: boolean; // it is true if the word has dictionary entries.
  detectedLangModel?: DetectedLangModel;
  phonetic?: string; // [ɡʊd]
  examTypes?: string[];
  speechUrl?: string; // word audio url. some language not have tts url, such as "ຂາດ"

  onMessage?: (message: { content: string; role: string }) => void;
  onError?: (error: string) => void;
  onFinish?: (reason: string) => void;
}

export interface YoudaoTranslateResultBasicItem {
  explains: string[];
  "us-phonetic"?: string; // American phonetic
  "us-speech"?: string;
  phonetic?: string; // Chinese word phonetic
  exam_type?: string[];
  wfs?: WordForms[]; // word forms
}

export interface WordForms {
  wf?: WordForm;
}

export interface WordForm {
  name: string;
  value: string;
}

export interface KeyValueItem {
  key: string;
  value: string[];
}

export interface ExplanationItem {
  title: string;
  subtitle: string;
}

/**
Youdao Web Translation.

eg:
{
  "errorCode": 0,
  "translateResult": [[{ "tgt": "壁虎", "src": "Gecko" }]],
  "type": "en2zh-CHS",
  "smartResult": { "entries": ["", "n. [脊椎] 壁虎\r\n"], "type": 1 }
}
*/
export interface YoudaoWebTranslateResult {
  errorCode?: number;
  translateResult: [[YoudaoWebTranslateResultItem]];
  type: string;
  smartResult?: {
    entries: [string];
    type: number;
  };
}

export interface YoudaoWebTranslateResultItem {
  tgt: string;
  src: string;
}

//-----------------------Youdao web dictionary------------------------------

/**
 * Youdao web dictionary model.
 *
 * See: https://dict.youdao.com/jsonapi?q=good&le=
 *
 * Ref: https://www.showdoc.com.cn/justapi/957479750776060#explain
 */

/**
 *

 */
// To parse this data:
//
//   import { Convert, Welcome } from "./file";
//
//   const welcome = Convert.toWelcome(json);

export interface YoudaoWebDictionaryModel {
  // English --> Chinese.
  input: string;
  lang: string; // 目标语言，eng。eg: https://www.youdao.com/w/eng/good
  le: string; // 目标语言，en
  meta?: Meta; // 元数据

  auth_sents_part?: AuthSentsPart; // 权威例句
  baike?: Baike; // 百科
  wikipedia_digest?: Baike; // 维基百科
  blng_sents_part?: BlngSentsPart; // 双语例句
  collins?: Collins; // 柯林斯英汉双解大辞典
  collins_primary?: CollinsPrimary; // 柯林斯？
  discriminate?: Discriminate; // 辨析
  ec?: Ec; // 英汉词典
  ee?: Ee; // 英英词典
  etym?: Etym; // 词源
  expand_ec?: ExpandEc; // 英汉词典扩展
  individual?: Individual; // 独有，考试类
  media_sents_part?: MediaSentsPart; // 原声例句
  oxford?: EncryptedObject; // 牛津辞典
  oxfordAdvance?: EncryptedObject; // 新版牛津辞典
  oxfordAdvanceHtml?: EncryptedObject;
  phrs?: Phrs; // 词组短语
  rel_word?: RelWord; // 同根词
  senior?: Senior; // 高级？
  simple?: Simple; // 简易词典
  special?: Special; // 专业释义
  syno?: Syno; // 同近义词
  video_sents?: VideoSents; // 视频例句
  web_trans?: WebTrans; // 网络释义
  webster?: EncryptedObject; // 韦氏词典
  word_video?: WordVideo; // 单词视频资料

  // Chinese --> English
  ce?: Ce; // （有道）汉英字典
  wuguanghua?: Wuguanghua; // 吴光华汉英大辞典
  ce_new?: CeNew; // 新汉英大辞典
  newhh?: Newhh; // 现代汉语规范词典

  fanyi?: Fanyi; // 翻译，仅在无词典结果时有值
}

export interface AuthSentsPart {
  "sentence-count"?: number;
  more?: string;
  sent?: AuthSentsPartSent[];
}

export interface AuthSentsPartSent {
  score?: number;
  speech?: string;
  "speech-size"?: string;
  source?: string;
  url?: string;
  foreign?: string;
}

export interface Baike {
  summarys?: BaikeSummary[];
  source?: BaikeSource;
}

export interface BaikeSource {
  name?: string;
  url?: string;
}

export interface BaikeSummary {
  summary?: string;
  key?: string;
}

export interface BlngSentsPart {
  "sentence-count"?: number;
  "sentence-pair"?: SentencePair[];
  more?: string;
  "trs-classify"?: TrsClassify[];
}

export interface SentencePair {
  sentence?: string;
  "sentence-eng"?: string;
  "sentence-translation"?: string;
  "speech-size"?: string;
  "aligned-words"?: AlignedWords;
  source?: string;
  url?: string;
  "sentence-speech"?: string;
}

export interface AlignedWords {
  src?: Src;
  tran?: Src;
}

export interface Src {
  chars?: Char[];
}

export interface Char {
  "@s"?: string;
  "@e"?: string;
  aligns?: Aligns;
  "@id"?: string;
}

export interface Aligns {
  sc?: Sc[];
  tc?: Sc[];
}

export interface Sc {
  "@id"?: string;
}

export interface TrsClassify {
  proportion?: string;
  tr?: string;
}

export interface Collins {
  super_headwords?: SuperHeadwords;
  collins_entries?: CollinsEntry[];
}

export interface CollinsEntry {
  super_headword?: string;
  entries?: Entries;
  phonetic?: string;
  basic_entries?: BasicEntries;
  headword?: string;
  star?: string;
}

export interface BasicEntries {
  basic_entry?: BasicEntry[];
}

export interface BasicEntry {
  cet?: string;
  headword?: string;
  wordforms?: Wordforms;
}

export interface Wordforms {
  wordform?: Wordform[];
}

export interface Wordform {
  word?: string;
}

export interface Entries {
  entry?: EntriesEntry[];
}

export interface EntriesEntry {
  tran_entry?: TranEntry[];
}

export interface TranEntry {
  pos_entry?: PosEntry;
  exam_sents?: ExamSents;
  tran?: string;
  gram?: string;
  box_extra?: string;
  seeAlsos?: SeeAlsos;
  headword?: string;
  sees?: Sees;
  loc?: string;
}

export interface ExamSents {
  sent?: ExamSentsSent[];
}

export interface ExamSentsSent {
  chn_sent?: string;
  eng_sent?: string;
}

export interface PosEntry {
  pos?: Pos;
  pos_tips?: PosTips;
}

export enum Pos {
  Adj = "ADJ",
  Convention = "CONVENTION",
  NSing = "N-SING",
  NUncount = "N-UNCOUNT",
  Phrase = "PHRASE",
}

export enum PosTips {
  不可数名词 = "不可数名词",
  习惯表达 = "习惯表达",
  习语 = "习语",
  单数型名词 = "单数型名词",
  形容词 = "形容词",
}

export interface SeeAlsos {
  seealso?: string;
  seeAlso?: See[];
}

export interface See {
  seeword?: string;
}

export interface Sees {
  see?: See[];
}

export interface SuperHeadwords {
  super_headword?: string[];
}

export interface CollinsPrimary {
  words?: Words;
  gramcat?: Gramcat[];
}

export interface Gramcat {
  audiourl?: string;
  pronunciation?: string;
  senses?: GramcatSense[];
  partofspeech?: string;
  audio?: string;
  forms?: Form[];
  phrases?: Phrase[];
}

export interface Form {
  form?: string;
}

export interface Phrase {
  phrase?: string;
  senses?: PhraseSense[];
}

export interface PhraseSense {
  examples?: Example[];
  definition?: string;
  lang?: Lang;
  word?: string;
}

export interface Example {
  sense?: ExampleSense;
  example?: string;
}

export interface ExampleSense {
  lang?: Lang;
  word?: string;
}

export enum Lang {
  ZhCN = "ZH-CN",
}

export interface GramcatSense {
  sensenumber?: string;
  examples?: Example[];
  definition?: string;
  lang?: Lang;
  word?: string;
  labelgrammar?: string;
}

export interface Words {
  indexforms?: string[];
  word?: string;
}

export interface Discriminate {
  data?: Datum[];
  "return-phrase"?: string;
}

export interface Datum {
  source?: string;
  usages?: DatumUsage[];
  headwords?: string[];
}

export interface DatumUsage {
  headword?: string;
  usage?: string;
}

export interface Ec {
  exam_type?: string[];
  source?: BaikeSource;
  word?: EcWord[];
}

export interface EcWord {
  usphone?: string;
  ukphone?: string;
  ukspeech?: string;
  trs?: PurpleTr[];
  wfs?: WordForms[];
  "return-phrase"?: EC_ReturnPhrase;
  usspeech?: string;
}

export interface EC_ReturnPhrase {
  l?: EE_I;
}

export interface EE_I {
  i?: string;
}

export interface PurpleTr {
  tr?: FluffyTr[];
}

export interface FluffyTr {
  l?: PurpleL;
}

export interface PurpleL {
  i?: string[];
}

export interface WfWf {
  name?: string;
  value?: string;
}

export interface Ee {
  source?: BaikeSource;
  word?: EeWord;
}

export interface EeWord {
  trs?: EE_PosTr[];
  phone?: string;
  speech?: string;
  "return-phrase"?: EC_ReturnPhrase;
}

export interface EE_PosTr {
  pos?: string;
  tr?: EE_Tr[];
}

export interface EE_Tr {
  exam?: EE_Exam;
  l?: EE_I;
  "similar-words"?: SimilarWord[];
}

export interface EE_Exam {
  i?: EE_I;
}

export interface EE_I {
  f?: EE_F;
}

export interface EE_F {
  l?: EE_I[];
}

export interface SimilarWord {
  similar?: string;
}

export interface Etym {
  etyms?: Etyms;
  word?: string;
}

export interface Etyms {
  zh?: Zh[];
}

export interface Zh {
  source?: string;
  word?: string;
  value?: string;
  url?: string;
  desc?: string;
}

export interface ExpandEc {
  "return-phrase"?: string;
  source?: BaikeSource;
  word?: ExpandEcWord[];
}

export interface ExpandEcWord {
  transList?: TransList[];
  pos?: string;
  wfs?: WfWf[];
}

export interface TransList {
  content?: Content;
  trans?: string;
}

export interface Content {
  detailPos?: string;
  examType?: Colloc[];
  sents?: ContentSent[];
}

export interface Colloc {
  en?: string;
  zh?: string;
}

export interface ContentSent {
  sentOrig?: string;
  sourceType?: SourceType;
  sentSpeech?: string;
  sentTrans?: string;
  source?: string;
  usages?: SentUsage[];
  type?: Type;
}

export enum SourceType {
  权威 = "权威",
  真题 = "真题",
}

export enum Type {
  Cet4 = "CET4",
  Cet6 = "CET6",
  Graduateexam = "GRADUATEEXAM",
  Senior = "SENIOR",
}

export interface SentUsage {
  phrase?: string;
  phraseTrans?: string;
}

export interface Individual {
  trs?: IndividualTr[];
  idiomatic?: Idiomatic[];
  level?: string;
  examInfo?: ExamInfo;
  "return-phrase"?: string;
  pastExamSents?: PastExamSent[];
}

export interface ExamInfo {
  year?: number;
  questionTypeInfo?: QuestionTypeInfo[];
  recommendationRate?: number;
  frequency?: number;
}

export interface QuestionTypeInfo {
  time?: number;
  type?: string;
}

export interface Idiomatic {
  colloc?: Colloc;
}

export interface PastExamSent {
  en?: string;
  source?: string;
  zh?: string;
}

export interface IndividualTr {
  pos?: string;
  tran?: string;
}

export interface Snippets {
  snippet?: Snippet[];
}

export interface Snippet {
  streamUrl?: string;
  duration?: string;
  swf?: string;
  name?: string;
  source?: string;
  win8?: string;
  sourceUrl?: string;
  imageUrl?: string;
}

export interface Meta {
  input: string;
  guessLanguage: string;
  isHasSimpleDict: string;
  le: string;
  lang: string;
  dicts: string[];
}

export interface EncryptedObject {
  encryptedData?: string;
}

export interface Phrs {
  word?: string;
  phrs?: PhrElement[];
}

export interface PhrElement {
  phr?: PhrPhr;
}

export interface PhrPhr {
  headword?: EC_ReturnPhrase;
  trs?: PhrTr[];
  source?: string;
}

export interface PhrTr {
  tr?: EC_ReturnPhrase;
}

export interface RelWordClass {
  word?: string;
  stem?: string;
  rels?: RelElement[];
}

export interface RelElement {
  rel?: RelRel;
}

export interface RelRel {
  pos?: string;
  words?: RelWord[];
}

export interface RelWord {
  word?: string;
  tran?: string;
}

export interface Senior {
  encryptedData?: string;
  source?: SeniorSource;
}

export interface SeniorSource {
  name?: string;
}

export interface Simple {
  query?: string;
  word?: SimpleWord[];
}

export interface SimpleWord {
  usphone?: string;
  usspeech?: string;

  ukphone?: string;
  ukspeech?: string;

  "return-phrase"?: string;
  phone?: string; // Chinese phenetic，中文音标
}

export interface Special {
  summary?: SpecialSummary;
  "co-add"?: string;
  total?: string;
  entries?: SpecialEntry[];
}

export interface SpecialEntry {
  entry?: EntryEntry;
}

export interface EntryEntry {
  major?: string;
  trs?: EntryTr[];
  num?: number;
}

export interface EntryTr {
  tr?: IndigoTr;
}

export interface IndigoTr {
  nat?: string;
  cite?: string;
  chnSent?: string;
  docTitle?: string;
  engSent?: string;
  url?: string;
}

export interface SpecialSummary {
  sources?: Sources;
  text?: string;
}

export interface Sources {
  source?: SourcesSource;
}

export interface SourcesSource {
  site?: string;
  url?: string;
}

export interface Syno {
  synos?: SynoElement[];
  word?: string;
}

export interface SynoElement {
  syno?: PurpleSyno;
}

export interface PurpleSyno {
  pos?: string;
  ws?: W[];
  tran?: string;
}

export interface W {
  w?: string;
}

export interface VideoSents {
  sents_data?: SentsDatum[];
  word_info?: WordInfo;
}

export interface SentsDatum {
  video_cover?: string;
  contributor?: string;
  subtitle_srt?: string;
  id?: number;
  video?: string;
}

export interface WordInfo {
  "return-phrase"?: string;
  sense?: string[];
}

export interface WebTrans {
  "web-translation"?: WebTranslation[];
}

export interface WebTranslation {
  "@same"?: string;
  key: string;
  "key-speech"?: string;
  trans?: Tran[];
}

export interface TranSummary {
  line?: string[];
}

export interface WordVideo {
  word_videos?: WordVideoElement[];
}

export interface WordVideoElement {
  ad?: Ad;
  video?: Video;
}

export interface Ad {
  avatar?: string;
  title?: string;
  url?: string;
}

export interface Video {
  cover?: string;
  image?: string;
  title?: string;
  url?: string;
}

// Chinese --> English

export interface BlngSentsPart {
  "sentence-count"?: number;
  "sentence-pair"?: SentencePair[];
  more?: string;
  "trs-classify"?: TrsClassify[];
}

export interface SentencePair {
  sentence?: string;
  "sentence-translation-speech"?: string;
  "sentence-eng"?: string;
  "sentence-translation"?: string;
  "speech-size"?: string;
  "aligned-words"?: AlignedWords;
  source?: string;
  url?: string;
}

export interface AlignedWords {
  src?: Src;
  tran?: Src;
}

export interface Src {
  chars?: Char[];
}

export interface Char {
  "@s"?: string;
  "@e"?: string;
  aligns?: Aligns;
  "@id"?: string;
}

export interface Aligns {
  sc?: Sc[];
  tc?: Sc[];
}

export interface Sc {
  "@id"?: string;
}

export interface TrsClassify {
  proportion?: string;
  tr?: string;
}

export interface Ce {
  source?: BaikeSource;
  word?: CeWord[];
}

export interface CeWord {
  trs?: CE_PurpleTr[];
  phone?: string;
  "return-phrase"?: CE_ReturnPhrase;
}

export interface CE_ReturnPhrase {
  l?: FL;
}

export interface FL {
  i?: string;
}

export interface CE_PurpleTr {
  tr?: CE_FluffyTr[];
}

export interface CE_FluffyTr {
  l?: CE_PurpleL;
}

export interface CE_PurpleL {
  pos?: string;
  i: (string | WordExplanation)[];
  // i: [string, WordExplanation];
  "#tran"?: string;
}

export interface WordExplanation {
  "#text"?: string;
  "@action"?: string;
  "@href"?: string;
}

export interface CeNew {
  source?: CeNewSource;
  word?: CeNewWord[];
}

export interface CeNewSource {
  name?: string;
}

export interface CeNewWord {
  trs?: TentacledTr[];
  phone?: string;
  "return-phrase"?: PurpleReturnPhrase;
}

export interface PurpleReturnPhrase {
  l?: FluffyL;
}

export interface FluffyL {
  i?: string[];
}

export interface TentacledTr {
  pos?: string;
  tr?: StickyTr[];
}

export interface StickyTr {
  exam?: Exam[];
  l?: FluffyL;
}

export interface Exam {
  i?: ExamI;
}

export interface ExamI {
  f?: EC_ReturnPhrase;
  n?: EC_ReturnPhrase;
}

export interface MediaSentsPart {
  "sentence-count"?: number;
  more?: string;
  query?: string;
  sent?: Sent[];
}

export interface Sent {
  "@mediatype"?: string;
  snippets?: Snippets;
  chn?: string;
  eng?: string;
  "speech-size"?: string;
}

export interface Snippets {
  snippet?: Snippet[];
}

export interface Snippet {
  sourceUrl?: string;
  streamUrl?: string;
  swf?: string;
  imageUrl?: string;
  name?: string;
  source?: string;
}

export interface Newhh {
  dataList?: ModernChineseDataList[];
  source?: CeNewSource;
  word?: string;
}

export interface ModernChineseDataList {
  pinyin?: string;
  sense?: Sense[];
  word: string;
  note?: string[];
  seealso?: string;
}

export interface Sense {
  examples?: string[];
  def?: string[] | string; // 的
  cat?: string;
  style?: string;
  subsense?: Sense[]; // 的
}

export interface Special {
  summary?: SpecialSummary;
  "co-add"?: string;
  total?: string;
  entries?: EntryElement[];
}

export interface EntryElement {
  entry?: EntryEntry;
}

export interface EntryEntry {
  major?: string;
  trs?: EntryTr[];
  num?: number;
}

export interface EntryTr {
  tr?: IndigoTr;
}

export interface IndigoTr {
  nat?: string;
  chnSent?: string;
  cite?: string;
  docTitle?: string;
  engSent?: string;
  url?: string;
}

export interface SpecialSummary {
  sources?: Sources;
  text?: string;
}

export interface Sources {
  source?: SourcesSource;
}

export interface SourcesSource {
  site?: string;
  url?: string;
}

export interface WebTrans {
  "web-translation"?: WebTranslation[];
}

export interface Tran {
  summary?: TranSummary;
  value?: string;
  support?: number;
  url?: string;
  cls?: Cls;
}

export interface Cls {
  cl?: string[];
}

export interface TranSummary {
  line?: string[];
}

export interface Wuguanghua {
  dataList?: WuguanghuaDataList[];
  source?: CeNewSource;
  word?: string;
}

export interface WuguanghuaDataList {
  trs?: DataListTr[];
  phone?: string;
  speech?: string;
}

export interface DataListTr {
  pos?: string;
  tr?: SentElement;
  sents?: SentElement[];
  rhetoric?: string;
}

export interface SentElement {
  en?: string;
  cn?: string;
}

// fanyi
export interface Fanyi {
  input?: string;
  type?: string;
  tran?: string;
}
