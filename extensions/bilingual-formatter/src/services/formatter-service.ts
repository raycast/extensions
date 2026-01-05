import { SpaceCorrector } from "../correctors/space-corrector";
import { CharacterCorrector } from "../correctors/character-corrector";
import { PunctuationCorrector } from "../correctors/punctuation-corrector";
import { QuoteCorrector } from "../correctors/quote-corrector";
import { MarkdownProtector } from "./markdown-protector";
import { Logger } from "../utils/logger";

export class FormatterService {
  private markdownProtector: MarkdownProtector;
  private spaceCorrector: SpaceCorrector;
  private characterCorrector: CharacterCorrector;
  private punctuationCorrector: PunctuationCorrector;
  private quoteCorrector: QuoteCorrector;

  constructor() {
    this.markdownProtector = new MarkdownProtector();
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

    let result = text;

    result = this.markdownProtector.protect(result);
    result = this.characterCorrector.handle(result);
    result = this.punctuationCorrector.handle(result);
    result = this.quoteCorrector.handle(result);
    result = this.spaceCorrector.handle(result);
    result = this.markdownProtector.restore(result);

    Logger.log("FormatterService: Format completed");
    return result;
  }
}
