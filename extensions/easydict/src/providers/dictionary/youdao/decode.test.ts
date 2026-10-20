import { describe, expect, it } from "vitest";

import { buildYoudaoContent } from "./content";
import { decodeYoudaoResponse } from "./decode";

describe("Youdao response decoder", () => {
  it.each([null, [], "not an object", 42])("rejects a non-object response with a protocol error: %j", (value) => {
    expect(() => decodeYoudaoResponse(value)).toThrow("Invalid Youdao dictionary response");
  });

  it("skips malformed optional leaves without losing valid sibling content", () => {
    const response = {
      input: "good",
      le: "en",
      ec: {
        word: [
          { trs: [null, { tr: [{ l: { i: ["好的"] } }] }], wfs: [null, { wf: { name: "比较级", value: "better" } }] },
        ],
      },
      ce: {
        word: [{ trs: [{ tr: [{ l: {} }] }, { tr: [{ l: { i: [null, 4, { "#text": "good" }], pos: false } }] }] }],
      },
      web_trans: { "web-translation": [{ key: "good", trans: [{ value: 4 }, { value: "好的" }] }] },
      newhh: {
        dataList: [{ pinyin: 4, sense: [null, { def: [false, "良好"], examples: [null, "<self>好</self>人"] }] }],
      },
      baike: { summarys: [{ key: 5, summary: "百科正文" }] },
      wikipedia_digest: { summarys: "broken" },
    };

    const content = buildYoudaoContent(query, decodeYoudaoResponse(response));

    expect(content.sections).toMatchObject([
      { kind: "translation", text: "好的" },
      { kind: "chinese-entry", entries: [{ summary: "~  1. 良好：好人  " }] },
      { kind: "definitions", entries: [{ kind: "plain", text: "good", note: "" }] },
      { kind: "form-set", forms: [{ label: "比较级", value: "better" }] },
      { kind: "pairs", relation: "web-translation", entries: [{ expression: "good", meaning: "好的" }] },
      { kind: "summary", source: "encyclopedia", entries: [{ subject: "", text: "百科正文" }] },
    ]);
  });

  it("keeps the first English headword, US pronunciation, last six exam tags, and forms", () => {
    const content = buildYoudaoContent(query, decodeYoudaoResponse(englishResponse));

    expect(content).toEqual({
      kind: "dictionary",
      query: {
        word: "good",
        fromLanguage: "en",
        toLanguage: "zh-CHS",
        isWord: true,
        phonetic: "/ɡʊd/",
        speechUrl: "https://dict.youdao.com/dictvoice?audio=good&type=2",
        examTypes: ["C", "D", "E", "F", "G", "H"],
      },
      sections: [
        { kind: "translation", text: "", pronunciation: undefined },
        { kind: "definitions", entries: [{ kind: "plain", text: "好的", note: "" }] },
        { kind: "form-set", forms: [{ label: "比较级", value: "better" }] },
      ],
    });
  });

  it("lets Chinese-English definitions and pronunciation replace English-Chinese while preserving audio, exams, and forms", () => {
    const content = buildYoudaoContent(
      query,
      decodeYoudaoResponse({
        ...englishResponse,
        ce: {
          word: [
            {
              phone: "hǎo",
              trs: [
                {
                  tr: [
                    {
                      l: {
                        i: ["ignored", { "#text": "do" }, { "#text": "well", "@href": "ignored" }],
                        pos: "v.",
                        "#tran": "事情",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(content.query).toMatchObject({
      phonetic: "/hǎo/",
      speechUrl: "https://dict.youdao.com/dictvoice?audio=good&type=2",
      examTypes: ["C", "D", "E", "F", "G", "H"],
    });
    expect(content.sections).toMatchObject([
      { kind: "translation" },
      { kind: "definitions", entries: [{ kind: "plain", text: "do well", note: "v.  事情" }] },
      { kind: "form-set", forms: [{ label: "比较级", value: "better" }] },
    ]);
  });

  it("uses only a matching first web entry for the main translation and keeps three following phrases", () => {
    const content = buildYoudaoContent(
      query,
      decodeYoudaoResponse({
        input: "GOOD",
        web_trans: {
          "web-translation": [
            { key: "good", trans: [{ value: "好的; 善良的" }, { value: "优良的" }] },
            ...["first", "second", "third", "fourth"].map((key) => ({ key, trans: [{ value: "词组" }] })),
          ],
        },
      }),
    );

    expect(content.sections).toEqual([
      { kind: "translation", text: "好的", pronunciation: undefined },
      {
        kind: "pairs",
        relation: "web-translation",
        entries: [{ expression: "good", meaning: "好的; 善良的；优良的" }],
      },
      {
        kind: "pairs",
        relation: "phrase",
        entries: [
          { expression: "first", meaning: "词组" },
          { expression: "second", meaning: "词组" },
          { expression: "third", meaning: "词组" },
        ],
      },
    ]);
  });

  it("keeps a later matching web entry among phrases instead of promoting it to the main translation", () => {
    const content = buildYoudaoContent(
      query,
      decodeYoudaoResponse({
        web_trans: {
          "web-translation": [
            { key: "first", trans: [{ value: "词组" }] },
            { key: "good", trans: [{ value: "好的" }] },
          ],
        },
      }),
    );

    expect(content.sections).toEqual([
      { kind: "translation", text: "", pronunciation: undefined },
      {
        kind: "pairs",
        relation: "phrase",
        entries: [
          { expression: "first", meaning: "词组" },
          { expression: "good", meaning: "好的" },
        ],
      },
    ]);
  });

  it.each(["fr", "ja", "ko"])(
    "preserves an explicit Chinese-to-%s request direction for shared dictionary content",
    (language) => {
      const content = buildYoudaoContent(
        { ...query, fromLanguage: "zh-CHS", toLanguage: language },
        decodeYoudaoResponse({
          le: language,
          meta: { guessLanguage: "eng" },
          baike: { summarys: [{ summary: "共享百科内容" }] },
        }),
      );

      expect(content.query).toMatchObject({ word: "good", fromLanguage: "zh-CHS", toLanguage: language });
      expect(content.sections[1]).toEqual({
        kind: "summary",
        source: "encyclopedia",
        entries: [{ subject: "", text: "共享百科内容" }],
      });
    },
  );

  it.each([
    { guess: "zh", from: "zh-CHS", to: "ja" },
    { guess: "jpn", from: "ja", to: "zh-CHS" },
  ])("uses validated response language for an automatic request with guess $guess", ({ guess, from, to }) => {
    const content = buildYoudaoContent(
      { ...query, fromLanguage: "auto" },
      decodeYoudaoResponse({
        le: "ja",
        meta: { guessLanguage: guess },
        baike: { summarys: [{ summary: "正文" }] },
      }),
    );

    expect(content.query).toMatchObject({ fromLanguage: from, toLanguage: to });
  });

  it.each(["unknown", "auto", 3])("keeps request metadata when response language is unusable: %j", (language) => {
    const content = buildYoudaoContent(
      { ...query, fromLanguage: "auto" },
      decodeYoudaoResponse({
        input: { bad: true },
        le: language,
        baike: { summarys: [{ summary: "正文" }] },
      }),
    );

    expect(content.query).toMatchObject({ word: "good", fromLanguage: "auto", toLanguage: "zh-CHS" });
  });

  it("cleans self tags at the existing two levels without changing deeper examples", () => {
    const content = buildYoudaoContent(
      query,
      decodeYoudaoResponse({
        newhh: {
          dataList: [
            {
              sense: [
                {
                  def: "一",
                  examples: ["<self>甲</self>"],
                  subsense: [
                    {
                      def: "二",
                      examples: ["<self>乙</self>"],
                      subsense: [{ def: "三", examples: ["<self>丙</self>"] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(content.sections[1]).toEqual({
      kind: "chinese-entry",
      entries: [
        {
          pronunciation: undefined,
          summary: "~  1. 一：甲     1.1. 二：乙     1.1. 三：<self>丙</self>  ",
          markdown: "\n\n~\n\n1. 一：`甲`    \n1.1. 二：`乙`    \n1.1. 三：`<self>丙</self>`  ",
        },
      ],
    });
  });

  it("returns no sections and the original query when no usable dictionary details exist", () => {
    const content = buildYoudaoContent(
      query,
      decodeYoudaoResponse({
        input: "other",
        le: "ja",
        ec: { word: "broken" },
        ce: [],
        newhh: { dataList: [{ pinyin: "hǎo" }] },
        web_trans: { "web-translation": [null, { key: "good", trans: [{ value: 4 }] }] },
      }),
    );

    expect(content).toEqual({ kind: "dictionary", query, sections: [] });
  });
});

const query = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS" };

// Minimal synthetic protocol response, including ignored alternatives to verify first-entry rules.
const englishResponse = {
  input: "good",
  le: "ja",
  meta: { guessLanguage: "zh" },
  ec: {
    exam_type: ["A", "B", "C", "D", "E", "F", "G", "H"],
    word: [
      {
        usphone: "ɡʊd",
        ukphone: "ignored",
        usspeech: "good&type=2",
        trs: [{ tr: [{ l: { i: ["好的", "ignored"] } }, { l: { i: ["ignored"] } }] }],
        wfs: [{ wf: { name: "比较级", value: "better" } }],
      },
      { usphone: "ignored", trs: [{ tr: [{ l: { i: ["ignored"] } }] }] },
    ],
  },
};
