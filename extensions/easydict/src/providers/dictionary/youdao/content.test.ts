import { describe, expect, it } from "vitest";

import { buildContentView } from "@/core/content/view";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryWordInfo } from "@/core/results/types";

import { buildYoudaoContent } from "./content";
import { decodeYoudaoResponse } from "./decode";

const query: QueryWordInfo = { word: "行", fromLanguage: "zh-CHS", toLanguage: "en", isWord: true };

const modernChineseResult = {
  newhh: {
    dataList: [
      {
        word: "行",
        pinyin: "xíng",
        sense: [
          {
            cat: "动",
            def: ["行走", "前进"],
            examples: ["步行", "日行千里"],
            subsense: [{ def: "旅行", examples: ["远行"] }, { def: "流动" }],
          },
          { cat: "动", def: "做", examples: ["实行"] },
          { cat: "名", def: "行为" },
          { cat: "动", def: "可以" },
        ],
      },
      {
        word: "行",
        pinyin: "háng",
        sense: [{ def: "行列", examples: ["一行树"] }, { subsense: [{ def: "行业" }] }],
      },
    ],
  },
};

function renderYoudao(query: QueryWordInfo, response: unknown) {
  return buildContentView(
    {
      services: [
        {
          type: DictionaryType.Youdao,
          serviceId: "youdao",
          serviceLabel: "Youdao Dictionary",
          serviceOrder: 0,
          content: buildYoudaoContent(query, decodeYoudaoResponse(response)),
        },
      ],
      isShowDetail: false,
    },
    true,
  ).map((section) => ({ ...section, items: section.items.map((row) => ({ ...row, body: row.renderBody() })) }));
}

describe("Youdao content reading contract", () => {
  it.each([
    {
      name: "a single form",
      forms: [{ wf: { name: "过去式", value: "ran" } }],
      copyText: "过去式: ran",
      body: " [ 过去式: ran ]",
    },
    {
      name: "multiple forms",
      forms: [{ wf: { name: "过去式", value: "ran" } }, { wf: { name: "过去分词", value: "run" } }],
      copyText: "过去式: ran   过去分词: run",
      body: " [ 过去式: ran   过去分词: run ]",
    },
  ])("keeps $name in one copyable row without copying the display brackets", ({ forms, copyText, body }) => {
    const sections = renderYoudao(
      { word: "run", fromLanguage: "en", toLanguage: "zh-CHS" },
      { ec: { word: [{ wfs: forms }] } },
    );

    expect(sections.map((section) => section.kind)).toEqual(["translation", "form-set"]);
    expect(sections[1]).toMatchObject({
      title: "Details",
      items: [{ title: "", subtitle: body, copyText, body }],
    });
  });

  it("keeps pronunciation rows, consecutive categories, recursive senses, and examples in list, copy, and Markdown", () => {
    const sections = renderYoudao(query, modernChineseResult);

    expect(sections.map((section) => section.kind)).toEqual(["translation", "chinese-entry"]);
    expect(sections[0].items[0].accessory).toMatchObject({ phonetic: "/xíng/" });
    expect(sections[1]).toMatchObject({
      title: "Details",
      items: [
        {
          title: "xíng",
          subtitle:
            "动   1. 行走; 前进：步行/日行千里     1.1. 旅行：远行   1.2. 流动  2. 做：实行  名   1. 行为动   1. 可以",
          copyText:
            "xíng  动   1. 行走; 前进：步行/日行千里     1.1. 旅行：远行   1.2. 流动  2. 做：实行  名   1. 行为动   1. 可以",
          body: "xíng\n\n动 \n\n1. 行走; 前进：`步行`/`日行千里`    \n1.1. 旅行：`远行`  \n1.2. 流动\n\n2. 做：`实行`  \n\n名 \n\n1. 行为\n\n动 \n\n1. 可以",
        },
        {
          title: "háng",
          subtitle: "~  1. 行列：一行树    2. ~   2.1. 行业",
          copyText: "háng  ~  1. 行列：一行树    2. ~   2.1. 行业",
          body: "háng\n\n~\n\n1. 行列：`一行树`  \n\n2. ~  \n2.1. 行业",
        },
      ],
    });
  });

  it("preserves an existing phonetic instead of replacing it with Chinese pinyin", () => {
    const sections = renderYoudao({ ...query, phonetic: "/existing/" }, modernChineseResult);

    expect(sections[0].items[0].accessory).toMatchObject({ phonetic: "/existing/" });
  });

  it.each([undefined, ""])(
    "uses pinyin from an entry without senses only as a display fallback when query phonetic is %j",
    (phonetic) => {
      const sections = renderYoudao(
        { ...query, phonetic },
        {
          ...modernChineseResult,
          newhh: { dataList: [{ word: "行", pinyin: "hàng" }, ...modernChineseResult.newhh.dataList] },
        },
      );

      expect(sections[0].items[0].accessory).toMatchObject({ phonetic: "/hàng/" });
      expect(sections[0].items[0].service.query.phonetic).toBe(phonetic);
      expect(sections[1].items).toHaveLength(2);
    },
  );

  it.each(["other", ""])("keeps an empty translation slot for key %j ahead of a later matching web entry", (key) => {
    const sections = renderYoudao(
      { word: "good", fromLanguage: "en", toLanguage: "zh-CHS" },
      {
        input: "good",
        web_trans: {
          "web-translation": [
            { key, trans: [{}] },
            { key: "good", trans: [{ value: "nice" }] },
          ],
        },
      },
    );

    expect(sections.map((section) => section.kind)).toEqual(["translation", "pairs"]);
    expect(sections[0].items[0]).toMatchObject({ title: "", copyText: "" });
    expect(sections[1].items).toMatchObject([
      { title: key, subtitle: "", copyText: `${key} ` },
      { title: "good", subtitle: "nice", copyText: "good nice" },
    ]);
  });

  it("returns no dictionary sections when web entries contain only empty translation slots", () => {
    const sections = renderYoudao(
      { word: "good", fromLanguage: "en", toLanguage: "zh-CHS" },
      {
        input: "good",
        web_trans: {
          "web-translation": [
            { key: "good", trans: [{}] },
            { key: "other", trans: [{}] },
          ],
        },
      },
    );

    expect(sections).toEqual([]);
  });

  it.each([
    {
      name: "a Baike summary starting with its subject",
      summary: { baike: { summarys: [{ key: "光", summary: "光是一种电磁辐射。" }] } },
      source: "encyclopedia",
      subtitle: "光是一种电磁辐射。",
      copyText: "光 光是一种电磁辐射。",
      body: "光是一种电磁辐射。",
    },
    {
      name: "a Wikipedia summary quoting its subject",
      summary: { wikipedia_digest: { summarys: [{ key: "光", summary: '物理学中的"光"是可见的电磁辐射。' }] } },
      source: "wikipedia",
      subtitle: '物理学中的"光"是可见的电磁辐射。',
      copyText: '光 物理学中的"光"是可见的电磁辐射。',
      body: '物理学中的"光"是可见的电磁辐射。',
    },
    {
      name: "a Baike summary without its subject",
      summary: { baike: { summarys: [{ key: "光", summary: "可见的电磁辐射。" }] } },
      source: "encyclopedia",
      subtitle: "可见的电磁辐射。",
      copyText: "光 可见的电磁辐射。",
      body: "光 可见的电磁辐射。",
    },
  ])("avoids repeating the subject in the body of $name", ({ summary, source, subtitle, copyText, body }) => {
    const sections = renderYoudao({ ...query, word: "光" }, summary);

    expect(sections[1]).toMatchObject({
      kind: "summary",
      items: [{ title: "光", subtitle, copyText, body, summarySource: source }],
    });
  });
});
