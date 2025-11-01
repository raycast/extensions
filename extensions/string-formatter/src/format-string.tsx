import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard, showHUD } from "@raycast/api";

// 语言配置
const languages = {
  zh: {
    separatorOptions: [
      { title: "自动检测", value: "" },
      { title: "逗号 (,)", value: "," },
      { title: "分号 (;)", value: ";" },
      { title: "空格 ( )", value: " " },
      { title: "竖线 (|)", value: "|" },
      { title: "制表符 (\\t)", value: "\t" },
      { title: "换行符 (\\n)", value: "\n" },
    ],
    decoratorOptions: [
      { title: "单引号 (')", value: "'" },
      { title: '双引号 (")', value: '"' },
      { title: "反引号 (`)", value: "`" },
      { title: "方括号 []", value: "[]" },
      { title: "圆括号 ()", value: "()" },
      { title: "花括号 {}", value: "{}" },
      { title: "无修饰符", value: "" },
    ],
    outputSeparatorOptions: [
      { title: "逗号 (,)", value: "," },
      { title: "分号 (;)", value: ";" },
      { title: "空格 ( )", value: " " },
      { title: "竖线 (|)", value: "|" },
      { title: "制表符 (\\t)", value: "\t" },
      { title: "换行符 (\\n)", value: "\n" },
    ],
    labels: {
      inputString: "输入字符串",
      inputPlaceholder: "请输入要格式化的字符串，例如：a,b,c",
      removeChars: "移除字符",
      removeCharsPlaceholder: "输入要移除的字符，例如：()[]",
      removeCharsInfo: "指定要从输入字符串中移除的字符",
      inputSeparator: "输入分隔符",
      separatorInfo: "自动检测或手动选择分隔符",
      decorator: "修饰符",
      decoratorInfo: "为每个元素添加的包装符号",
      outputSeparator: "输出分隔符",
      outputSeparatorInfo: "格式化结果中元素之间的分隔符",
      removeDuplicates: "去重选项",
      removeDuplicatesLabel: "移除重复项",
      removeDuplicatesInfo: "自动移除输出结果中的重复元素",
      previewResult: "预览结果",
      previewPlaceholder: "输入字符串后将显示格式化结果",
      copyResult: "复制结果",
      reset: "重置",
      detectedSeparator: "检测到分隔符",
      noContent: "没有可复制的内容",
      noContentMessage: "请先输入要格式化的字符串",
      copySuccess: "✅ 已复制到剪贴板",
      copyFailed: "复制失败",
      copyFailedMessage: "无法复制到剪贴板",
      formatError: "格式化过程中发生错误",
    },
  },
  en: {
    separatorOptions: [
      { title: "Auto Detect", value: "" },
      { title: "Comma (,)", value: "," },
      { title: "Semicolon (;)", value: ";" },
      { title: "Space ( )", value: " " },
      { title: "Pipe (|)", value: "|" },
      { title: "Tab (\\t)", value: "\t" },
      { title: "Newline (\\n)", value: "\n" },
    ],
    decoratorOptions: [
      { title: "Single Quote (')", value: "'" },
      { title: 'Double Quote (")', value: '"' },
      { title: "Backtick (`)", value: "`" },
      { title: "Square Brackets []", value: "[]" },
      { title: "Parentheses ()", value: "()" },
      { title: "Curly Braces {}", value: "{}" },
      { title: "No Decorator", value: "" },
    ],
    outputSeparatorOptions: [
      { title: "Comma (,)", value: "," },
      { title: "Semicolon (;)", value: ";" },
      { title: "Space ( )", value: " " },
      { title: "Pipe (|)", value: "|" },
      { title: "Tab (\\t)", value: "\t" },
      { title: "Newline (\\n)", value: "\n" },
    ],
    labels: {
      inputString: "Input String",
      inputPlaceholder: "Enter the string to format, e.g.: a,b,c",
      removeChars: "Remove Characters",
      removeCharsPlaceholder: "Enter characters to remove, e.g.: ()[]",
      removeCharsInfo: "Specify characters to remove from input string",
      inputSeparator: "Input Separator",
      separatorInfo: "Auto detect or manually select separator",
      decorator: "Decorator",
      decoratorInfo: "Wrapper symbols to add around each element",
      outputSeparator: "Output Separator",
      outputSeparatorInfo: "Separator between elements in formatted result",
      removeDuplicates: "Deduplication",
      removeDuplicatesLabel: "Remove Duplicates",
      removeDuplicatesInfo: "Automatically remove duplicate elements from output",
      previewResult: "Preview Result",
      previewPlaceholder: "Formatted result will be displayed after input",
      copyResult: "Copy Result",
      reset: "Reset",
      detectedSeparator: "Detected separator",
      noContent: "No content to copy",
      noContentMessage: "Please enter a string to format first",
      copySuccess: "✅ Copied to clipboard",
      copyFailed: "Copy failed",
      copyFailedMessage: "Unable to copy to clipboard",
      formatError: "Error occurred during formatting",
    },
  },
};

export default function Command() {
  const lang = "en";
  const t = languages[lang as keyof typeof languages] || languages.en;

  const [inputString, setInputString] = useState<string>("");
  const [removeChars, setRemoveChars] = useState<string>("");
  const [separator, setSeparator] = useState<string>("");
  const [decorator, setDecorator] = useState<string>("'");
  const [outputSeparator, setOutputSeparator] = useState<string>(",");
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true);
  const [formattedResult, setFormattedResult] = useState<string>("");
  const [detectedSeparator, setDetectedSeparator] = useState<string>("");
  const [error, setError] = useState<string>("");

  // 自动检测分隔符
  const detectSeparator = (input: string): string => {
    if (!input.trim()) return "";

    const separators = [",", ";", "|", " ", "\t", "\n"];

    for (const sep of separators) {
      if (input.includes(sep)) {
        return sep;
      }
    }

    return "";
  };

  // 格式化字符串的核心逻辑
  const formatString = (
    input: string,
    removeCh: string,
    sep: string,
    dec: string,
    outSep: string,
    dedup: boolean,
  ): { result: string; detectedSep: string } => {
    if (!input.trim()) {
      return { result: "", detectedSep: "" };
    }

    try {
      let processedInput = input;

      // 移除指定字符
      if (removeCh.trim()) {
        const charsToRemove = removeCh.split("").map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const removeRegex = new RegExp(`[${charsToRemove.join("")}]`, "g");
        processedInput = processedInput.replace(removeRegex, "");
      }

      // 确定使用的分隔符
      let actualSeparator = sep;
      let detectedSep = "";
      if (!actualSeparator) {
        actualSeparator = detectSeparator(processedInput);
        detectedSep = actualSeparator;
      }

      if (!actualSeparator) {
        // 如果没有检测到分隔符，将整个字符串作为单个元素
        const trimmed = processedInput.trim();
        if (!trimmed) return { result: "", detectedSep };

        if (dec === "[]") {
          return { result: `[${trimmed}]`, detectedSep };
        } else if (dec === "()") {
          return { result: `(${trimmed})`, detectedSep };
        } else if (dec === "{}") {
          return { result: `{${trimmed}}`, detectedSep };
        } else if (dec === "") {
          return { result: trimmed, detectedSep };
        } else {
          return { result: `${dec}${trimmed}${dec}`, detectedSep };
        }
      }

      // 处理特殊分隔符
      const finalSeparator = actualSeparator === "\\t" ? "\t" : actualSeparator === "\\n" ? "\n" : actualSeparator;

      // 分割字符串并去除空白
      let parts = processedInput
        .split(finalSeparator)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      if (parts.length === 0) {
        return { result: "", detectedSep };
      }

      // 去重处理
      if (dedup) {
        parts = Array.from(new Set(parts));
      }

      // 应用修饰符
      let decoratedParts: string[];

      if (dec === "[]") {
        decoratedParts = parts.map((part) => `[${part}]`);
      } else if (dec === "()") {
        decoratedParts = parts.map((part) => `(${part})`);
      } else if (dec === "{}") {
        decoratedParts = parts.map((part) => `{${part}}`);
      } else if (dec === "") {
        decoratedParts = parts;
      } else {
        decoratedParts = parts.map((part) => `${dec}${part}${dec}`);
      }

      // 使用指定的输出分隔符
      const finalOutputSeparator = outSep === "\\t" ? "\t" : outSep === "\\n" ? "\n" : outSep;
      return { result: decoratedParts.join(finalOutputSeparator), detectedSep };
    } catch {
      throw new Error(t.labels.formatError);
    }
  };

  // 实时更新格式化结果
  useEffect(() => {
    try {
      setError("");
      const { result, detectedSep } = formatString(
        inputString,
        removeChars,
        separator,
        decorator,
        outputSeparator,
        removeDuplicates,
      );
      setFormattedResult(result);
      setDetectedSeparator(detectedSep);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.labels.formatError);
      setFormattedResult("");
    }
  }, [inputString, removeChars, separator, decorator, outputSeparator, removeDuplicates, t]);

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!formattedResult) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.labels.noContent,
        message: t.labels.noContentMessage,
      });
      return;
    }

    try {
      await Clipboard.copy(formattedResult);
      await showHUD(t.labels.copySuccess);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t.labels.copyFailed,
        message: t.labels.copyFailedMessage,
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setInputString("");
    setRemoveChars("");
    setSeparator("");
    setDecorator("'");
    setOutputSeparator(",");
    setRemoveDuplicates(true);
    setFormattedResult("");
    setDetectedSeparator("");
    setError("");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title={t.labels.copyResult} onAction={copyToClipboard} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action title={t.labels.reset} onAction={resetForm} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        </ActionPanel>
      }
    >
      {/* 输入区域 */}
      <Form.TextArea
        id="inputString"
        title={t.labels.inputString}
        placeholder={t.labels.inputPlaceholder}
        value={inputString}
        onChange={setInputString}
        error={error}
      />

      <Form.TextField
        id="removeChars"
        title={t.labels.removeChars}
        placeholder={t.labels.removeCharsPlaceholder}
        value={removeChars}
        onChange={setRemoveChars}
        info={t.labels.removeCharsInfo}
      />

      <Form.Dropdown
        id="separator"
        title={t.labels.inputSeparator}
        value={separator}
        onChange={setSeparator}
        info={detectedSeparator ? `${t.labels.detectedSeparator}: ${detectedSeparator}` : t.labels.separatorInfo}
      >
        {t.separatorOptions.map((option) => (
          <Form.Dropdown.Item value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {/* 分隔线 */}
      <Form.Separator />

      {/* 输出区域 */}
      <Form.Dropdown
        id="decorator"
        title={t.labels.decorator}
        value={decorator}
        onChange={setDecorator}
        info={t.labels.decoratorInfo}
      >
        {t.decoratorOptions.map((option) => (
          <Form.Dropdown.Item value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="outputSeparator"
        title={t.labels.outputSeparator}
        value={outputSeparator}
        onChange={setOutputSeparator}
        info={t.labels.outputSeparatorInfo}
      >
        {t.outputSeparatorOptions.map((option) => (
          <Form.Dropdown.Item value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="removeDuplicates"
        title={t.labels.removeDuplicates}
        label={t.labels.removeDuplicatesLabel}
        value={removeDuplicates}
        onChange={setRemoveDuplicates}
        info={t.labels.removeDuplicatesInfo}
      />

      <Form.Description title={t.labels.previewResult} text={formattedResult || t.labels.previewPlaceholder} />
    </Form>
  );
}
