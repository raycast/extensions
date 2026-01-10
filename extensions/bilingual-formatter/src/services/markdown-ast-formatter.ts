import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";
import { Logger } from "../utils/logger";

// 导入现有的格式化器
import { SpaceCorrector } from "../correctors/space-corrector";
import { CharacterCorrector } from "../correctors/character-corrector";
import { PunctuationCorrector } from "../correctors/punctuation-corrector";
import { QuoteCorrector } from "../correctors/quote-corrector";

/**
 * 基于 Markdown AST 的格式化器
 *
 * 工作原理：
 * 1. 将 Markdown 解析为 AST (Abstract Syntax Tree)
 * 2. 遍历 AST，只对文本节点应用格式化规则
 * 3. 保持 Markdown 语法节点（标题、粗体、斜体等）不变
 * 4. 将格式化后的 AST 转回 Markdown
 */
export class MarkdownASTFormatter {
  private spaceCorrector: SpaceCorrector;
  private characterCorrector: CharacterCorrector;
  private punctuationCorrector: PunctuationCorrector;
  private quoteCorrector: QuoteCorrector;

  constructor() {
    this.spaceCorrector = new SpaceCorrector();
    this.characterCorrector = new CharacterCorrector();
    this.punctuationCorrector = new PunctuationCorrector();
    this.quoteCorrector = new QuoteCorrector();
  }

  /**
   * 格式化 Markdown 文本
   */
  format(markdown: string): string {
    Logger.log("MarkdownASTFormatter: Starting format");

    try {
      // 解析 Markdown 为 AST
      const processor = unified().use(remarkParse);
      const ast = processor.parse(markdown) as Root;

      Logger.log("MarkdownASTFormatter: Parsed to AST");

      // 遍历 AST 并格式化文本节点
      visit(ast, "text", (node: Text) => {
        const originalValue = node.value;

        // 应用所有格式化规则（按顺序）
        let formattedValue = originalValue;

        // 1. 空格处理
        formattedValue = this.spaceCorrector.handle(formattedValue);

        // 2. 字符转换
        formattedValue = this.characterCorrector.handle(formattedValue);

        // 3. 标点符号
        formattedValue = this.punctuationCorrector.handle(formattedValue);

        // 4. 引号处理
        formattedValue = this.quoteCorrector.handle(formattedValue);

        // 更新节点值
        node.value = formattedValue;

        if (originalValue !== formattedValue) {
          Logger.log(
            `MarkdownASTFormatter: Formatted text node: "${originalValue}" -> "${formattedValue}"`,
          );
        }
      });

      Logger.log("MarkdownASTFormatter: Finished visiting nodes");

      // 将 AST 转回 Markdown
      const stringifier = unified().use(remarkStringify, {
        bullet: "-", // 使用 - 作为列表标记
        emphasis: "*", // 使用 * 作为斜体标记
        strong: "*", // 使用 ** 作为粗体标记
        rule: "-", // 使用 --- 作为分隔线
        fences: true, // 使用围栏式代码块（```）
        incrementListMarker: false, // 不递增有序列表编号
        // 减少转义
        resourceLink: true, // 使用 [text](url) 而不是 [text][ref]
      });

      let result = String(stringifier.stringify(ast));

      // 移除 remark-stringify 添加的不必要的转义
      // 它有时会转义括号，我们需要去掉这些转义
      result = result.replace(/\\\(/g, "(").replace(/\\\)/g, ")");

      Logger.log("MarkdownASTFormatter: Converted back to Markdown");

      return result;
    } catch (error) {
      Logger.log(`MarkdownASTFormatter: Error during formatting: ${error}`);
      // 如果解析失败，返回原始文本
      return markdown;
    }
  }

  /**
   * 检查文本是否是 Markdown
   *
   * 简单的启发式检查：如果包含 Markdown 语法特征，就认为是 Markdown
   */
  static isMarkdown(text: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s/, // 标题
      /\*\*.*\*\*/, // 粗体
      /\*.*\*/, // 斜体
      /`.*`/, // 行内代码
      /```/, // 代码块
      /^\s*[-*+]\s/, // 无序列表
      /^\s*\d+\.\s/, // 有序列表
      /\[.*\]\(.*\)/, // 链接
      /!\[.*\]\(.*\)/, // 图片
    ];

    return markdownPatterns.some((pattern) => pattern.test(text));
  }
}
