import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Detail,
  environment,
  List,
  getPreferenceValues,
  getSelectedText,
  Icon,
  Color,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState, useRef } from "react";
import fs from "fs";
import path from "path";

// --- 类型定义 ---
// 注意：不要手动定义 Preferences，使用 Raycast 自动生成的 Preferences 类型（raycast-env.d.ts）

interface FlypyData {
  character: string;
  level: string;
  fly_code: string;
  order: string;
  first_part: string;
  first_py: string;
  last_part: string;
  last_py: string;
}

interface RuleDetail {
  stroke?: string;
  components?: string;
  mnemonic?: string;
  small_words?: string;
}
type XiaoheRules = Record<string, RuleDetail>;

// --- 工具函数 ---

function sanitizeMarkdown(text: string): string {
  if (!text) return "";
  let clean = text;

  clean = clean.replace(/<\s*br\s*\/?>/gim, "\n");
  clean = clean.replace(/&lt;\s*br\s*\/?&gt;/gim, "\n");
  clean = clean.replace(/<[^>]+>/g, "");

  // Remove fenced code blocks (``` ... ```) without regex literal involving backticks
  clean = clean
    .split("```")
    .filter((_, idx) => idx % 2 === 0)
    .join("");

  clean = clean.replace(
    /[\u{1F300}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}]/gu,
    "",
  );
  clean = clean.replace(/\n{3,}/g, "\n\n");
  return clean.trim();
}

function isSingleChineseChar(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (Array.from(trimmed).length !== 1) return false;

  try {
    return /\p{Script=Han}/u.test(trimmed);
  } catch {
    // Fallback when Unicode property escapes are not supported.
    const cp = trimmed.codePointAt(0);
    return typeof cp === "number" && cp > 0x7f;
  }
}

async function getSelectedTextStandard(): Promise<string | null> {
  try {
    const text = await getSelectedText();
    return text.trim();
  } catch {
    return null;
  }
}

function loadFlypyData(): Map<string, FlypyData> {
  try {
    const filePath = path.join(environment.assetsPath, "flypy_n.json");
    if (!fs.existsSync(filePath)) return new Map();
    const content = fs.readFileSync(filePath, "utf-8");
    const data: FlypyData[] = JSON.parse(content);
    const map = new Map<string, FlypyData>();
    data.forEach((item) => {
      if (item.character) map.set(item.character, item);
    });
    return map;
  } catch (error) {
    console.error("Error loading flypy data:", error);
    return new Map();
  }
}

function loadXiaoheRules(): XiaoheRules {
  try {
    const filePath = path.join(environment.assetsPath, "xiaohe_rules.json");
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error loading rules:", error);
    return {};
  }
}

function getUnicode(char: string) {
  if (!char) return "";
  const code = char.codePointAt(0);
  return code ? `U+${code.toString(16).toUpperCase()}` : "";
}

// --- 结果详情页 ---

function ResultView({ char, data, rules }: { char: string; data?: FlypyData; rules: XiaoheRules }) {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [aiContent, setAiContent] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  const parseResult = useMemo(() => {
    if (!data) return null;

    const rawCodeString = data.fly_code;
    const codes = rawCodeString.split(/\s+/);
    const isPolyphonic = codes.length > 1;

    const displayCodes = codes.map((code) => {
      const isRare = code.includes("*");
      const isAvoid = code.includes("-");
      const cleanCode = code.replace(/\*/g, "").replace(/-/g, "");

      const shengmu = cleanCode.slice(0, 1);
      const yunmu = cleanCode.slice(1, 2);

      return { code, cleanCode, shengmu, yunmu, isRare, isAvoid };
    });

    const firstKey = data.first_py ? data.first_py.toLowerCase().charAt(0) : "";
    const lastKey = data.last_py ? data.last_py.toLowerCase().charAt(0) : "";

    const rule1 = rules[firstKey];
    const rule2 = rules[lastKey];

    const firstCheck = (key: string, part: string, r?: RuleDetail) => {
      if (!r) return { text: "首形：无数据", mnemonic: "" };
      let text = "";
      let mnemonic = "";
      if (r.stroke && r.stroke.includes(part)) {
        text = `首形：“${part}”是笔画，对应${key.toUpperCase()}键（${r.stroke}）`;
      } else if (r.components && r.components.includes(part)) {
        text = `首形：“${part}”是部件，对应${key.toUpperCase()}键（${r.mnemonic}）`;
        mnemonic = r.mnemonic || "";
      } else if (r.small_words && r.small_words.includes(part)) {
        text = `首形：“${part}”是小字，对应${key.toUpperCase()}键`;
      } else {
        text = `首形：“${part}”归类于${key.toUpperCase()}键（${r.mnemonic || "无口诀"}）`;
        mnemonic = r.mnemonic || "";
      }
      return { text, mnemonic };
    };

    const lastCheck = (key: string, part: string, r?: RuleDetail) => {
      if (!r) return { text: "末形：无数据", mnemonic: "" };
      let text = "";
      let mnemonic = "";
      if (r.small_words && r.small_words.includes(part)) {
        text = `末形：“${part}”是小字，对应${key.toUpperCase()}键`;
      } else if (r.stroke && r.stroke.includes(part)) {
        text = `末形：“${part}”是笔画，对应${key.toUpperCase()}键（${r.stroke}）`;
      } else if (r.components && r.components.includes(part)) {
        text = `末形：“${part}”是部件，对应${key.toUpperCase()}键（${r.mnemonic}）`;
        mnemonic = r.mnemonic || "";
      } else {
        text = `末形：“${part}”归类于${key.toUpperCase()}键`;
      }
      return { text, mnemonic };
    };

    const firstResult = firstCheck(firstKey, data.first_part, rule1);
    const lastResult = lastCheck(lastKey, data.last_part, rule2);

    let finalMnemonic = "";
    if (firstResult.mnemonic && lastResult.mnemonic) {
      finalMnemonic = `${firstResult.mnemonic}，${lastResult.mnemonic}`;
    } else if (firstResult.mnemonic) {
      finalMnemonic = firstResult.mnemonic;
    } else if (lastResult.mnemonic) {
      finalMnemonic = lastResult.mnemonic;
    } else {
      finalMnemonic = "无 (直接取键)";
    }

    return {
      statusType: isPolyphonic ? "多音字" : rawCodeString.includes("*") ? "生僻字" : "常用字",
      displayCodes,
      firstLogicText: firstResult.text,
      lastLogicText: lastResult.text,
      finalMnemonic,
    };
  }, [data, rules]);

  useEffect(() => {
    let isMounted = true;

    async function askAI() {
      if (!char) return;

      setIsLoadingAI(true);
      setAiContent("");

      try {
        let prompt = "";
        if (data && parseResult) {
          prompt = `
你是一个中文语言专家和小鹤音形查码助手。请分析汉字「${char}」。

**权威数据**：
-  拆字拆分：${data.order}
-  首形部件：${data.first_part} (键位 ${data.first_py.toUpperCase()})
-  末形部件：${data.last_part} (键位 ${data.last_py.toUpperCase()})

**双形解析逻辑**：
1. **第三码(首形)**：${parseResult.firstLogicText}
2. **第四码(末形)**：${parseResult.lastLogicText}

**任务要求**：
1.  **拼音列举**：请在“基本信息”中列出该汉字的所有标准普通话读音（带声调）。
    -   **完整性**：必须列出所有读音（含生僻读音）。
    -   **去重**：严禁重复。
    -   **分隔**：不同读音之间请使用 " / " 分隔。
2.  **编码解析**：对以下编码进行逐一解析。
    ${parseResult.displayCodes
      .map((item) => `- 编码 \`${item.cleanCode}\`：双拼声母键[${item.shengmu}]，双拼韵母键[${item.yunmu}]。`)
      .join("\n")}

**输出格式规则**：
1.  **禁止 Emoji**。
2.  **拼音标注**：部件加拼音（例如：女(nǚ)）。
3.  **扩展信息**：笔画数、常用词组（拼音音节用空格分开）。
4.  **极速助记**：${parseResult.finalMnemonic}

**输出模板**：
### 基本信息
**拼音**：... (去重，使用 " / " 分隔) | **部首**：${data.first_part}
> **释义**：...

---
### 扩展资料
*   **笔画数**：...
*   **常用词组**：...

---
### 极速助记
**字根口诀**：${parseResult.finalMnemonic}
`;
        } else {
          prompt = `
你是一个中文语言专家和小鹤音形查码助手。用户正在查询一个本地字库未收录的汉字：「${char}」。
请给出拼音（所有读音、去重、用 " / " 分隔）、部首、释义，并尽量推导小鹤音形编码。
`;
        }

        const creativity = parseFloat(preferences.aiCreativity);
        const options: AI.AskOptions = { creativity: isNaN(creativity) ? 0 : creativity };

        const answer = await AI.ask(prompt, options);
        const cleanAnswer = sanitizeMarkdown(answer);

        if (isMounted) setAiContent(cleanAnswer);
      } catch (error) {
        if (isMounted) setAiContent(`> **AI 分析暂时不可用**\n\n${String(error)}`);
      } finally {
        if (isMounted) setIsLoadingAI(false);
      }
    }

    askAI();

    return () => {
      isMounted = false;
    };
  }, [char, data, parseResult, preferences.aiCreativity]);

  const unicode = useMemo(() => getUnicode(char), [char]);

  const aiSection = aiContent ? aiContent : isLoadingAI ? `### 正在分析...\n\n> 正在分析汉字 **${char}** ...` : "";

  const markdown = `
# ${char}

${!data ? "> **注意**：本地字库未收录此字，以下内容由 AI 生成，仅供参考。" : ""}

${aiSection}

---
> **参考**：[小鹤音形拆分规则](https://flypy.cc/help/#/ux)
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingAI}
      navigationTitle={`查询结果: ${char}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="汉字" text={char} />
          <Detail.Metadata.Label title="统一码" text={unicode} />

          <Detail.Metadata.Separator />

          {parseResult && (
            <Detail.Metadata.TagList title="小鹤编码">
              {parseResult.displayCodes.map((item, idx) => (
                <Detail.Metadata.TagList.Item
                  key={idx}
                  text={
                    item.isAvoid
                      ? `${item.cleanCode} 全码避让（有简码）`
                      : item.isRare
                        ? `${item.cleanCode} 生僻字`
                        : item.cleanCode
                  }
                  color={item.isAvoid ? Color.Orange : item.isRare ? Color.Blue : Color.Green}
                  icon={item.isAvoid ? Icon.Warning : item.isRare ? Icon.Info : Icon.CheckCircle}
                />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {data && (
            <>
              <Detail.Metadata.Label
                title="拆分"
                text={`${data.first_part} [${data.first_py.toUpperCase()}]  →  ${data.last_part} [${data.last_py.toUpperCase()}]`}
              />
              <Detail.Metadata.Label title="笔顺" text={data.order} />
              <Detail.Metadata.Label
                title="字频"
                text={parseResult?.statusType}
                icon={data.level === "1" ? Icon.Star : Icon.Circle}
              />
              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.Label title="分析模型" text="Raycast Quick AI" icon={Icon.Stars} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {parseResult?.displayCodes[0] && (
            <Action.CopyToClipboard title="复制主编码" content={parseResult.displayCodes[0].cleanCode} />
          )}
          <Action title="查询其他字" icon={Icon.MagnifyingGlass} onAction={pop} />
          <Action.OpenInBrowser title="查看官方规则" url="https://flypy.cc/help/#/ux" />
          <Action.CopyToClipboard
            title="复制分析结果"
            content={aiContent}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// --- Main Controller (Search List) ---

export default function Command() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const flypyDataMap = useMemo(() => loadFlypyData(), []);
  const xiaoheRules = useMemo(() => loadXiaoheRules(), []);

  const hasInitialized = useRef(false);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function initDetect() {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      let foundChar = "";
      const strategy = preferences.inputStrategy;

      try {
        if (strategy === "selection" || strategy === "auto") {
          const selected = await getSelectedTextStandard();
          if (selected && isSingleChineseChar(selected)) foundChar = selected;
        }

        if (!foundChar && (strategy === "clipboard" || (strategy === "auto" && !foundChar))) {
          try {
            const clip = await Clipboard.readText();
            if (clip) {
              const trimmed = clip.trim();
              const first = Array.from(trimmed)[0];
              if (isSingleChineseChar(first) && Array.from(trimmed).length === 1) foundChar = first;
            }
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.error(e);
      }

      if (foundChar) {
        push(<ResultView char={foundChar} data={flypyDataMap.get(foundChar)} rules={xiaoheRules} />);
      }

      setIsLoading(false);
    }

    initDetect();
  }, [flypyDataMap, preferences.inputStrategy, push, xiaoheRules]);

  const handleManualSearch = (char: string) => {
    if (!isSingleChineseChar(char)) return;
    push(<ResultView char={char} data={flypyDataMap.get(char)} rules={xiaoheRules} />);
  };

  const isValid = isSingleChineseChar(searchText);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="输入单个汉字..."
    >
      {isValid ? (
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={`查询：「${searchText}」`}
          subtitle="按回车查看详情"
          actions={
            <ActionPanel>
              <Action title="查询" onAction={() => handleManualSearch(searchText)} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Text}
          title="小鹤查码"
          description={isLoading ? "正在检测输入..." : "输入单个汉字查询小鹤音形编码"}
        />
      )}
    </List>
  );
}
