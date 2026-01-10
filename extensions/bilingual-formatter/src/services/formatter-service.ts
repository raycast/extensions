import { SpaceCorrector } from "../correctors/space-corrector";
import { CharacterCorrector } from "../correctors/character-corrector";
import { PunctuationCorrector } from "../correctors/punctuation-corrector";
import { QuoteCorrector } from "../correctors/quote-corrector";
import { MarkdownProtector } from "./markdown-protector";
import { MarkdownASTFormatter } from "./markdown-ast-formatter";
import { Logger } from "../utils/logger";

export class FormatterService {
  private markdownProtector: MarkdownProtector;
  private markdownASTFormatter: MarkdownASTFormatter;
  private spaceCorrector: SpaceCorrector;
  private characterCorrector: CharacterCorrector;
  private punctuationCorrector: PunctuationCorrector;
  private quoteCorrector: QuoteCorrector;

  constructor() {
    this.markdownProtector = new MarkdownProtector();
    this.markdownASTFormatter = new MarkdownASTFormatter();
    this.spaceCorrector = new SpaceCorrector();
    this.characterCorrector = new CharacterCorrector();
    this.punctuationCorrector = new PunctuationCorrector();
    this.quoteCorrector = new QuoteCorrector();
  }

  format(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }

    Logger.log("FormatterService: Starting format");

    // 检测是否包含 Markdown 语法
    const isMarkdown = MarkdownASTFormatter.isMarkdown(text);

    if (isMarkdown) {
      Logger.log("FormatterService: Detected Markdown, using AST formatter");
      // 使用基于 AST 的格式化器
      const result = this.markdownASTFormatter.format(text);
      Logger.log("FormatterService: AST format completed");
      return result;
    } else {
      Logger.log("FormatterService: Plain text, using traditional formatter");
      // 使用传统的保护+格式化方式
      let result = text;

      result = this.markdownProtector.protect(result);
      result = this.characterCorrector.handle(result);
      result = this.punctuationCorrector.handle(result);
      result = this.quoteCorrector.handle(result);
      result = this.spaceCorrector.handle(result);
      result = this.markdownProtector.restore(result);

      Logger.log("FormatterService: Traditional format completed");
      return result;
    }
  }
}
