import { Cache } from "@raycast/api";

export interface LanguageHandler {
  name: string;
  /**
   * check if user input text contain specific language
   * @param text target text
   * @param input user input text
   */
  check(text: string, input: string): boolean;
  /** serialize target text */
  serialize(text: string): string;
}

interface SerializeConfig {
  id: string;
  lang?: string;
}

export class LanguageAdaptor {
  private langCache = new Cache();
  private langHandlers = new Map<string, LanguageHandler>();

  private formatStringWithLang(id: string, userInput: string, target: string, lang: string): string {
    const key = this.getCacheKey(lang, id);
    if (this.langCache.has(key)) {
      if (process.env.NODE_ENV === "development") {
        console.log("cache hit", key);
      }
      return this.langCache.get(key)!;
    }

    const handler = this.langHandlers.get(lang);
    if (handler && handler.check(target, userInput)) {
      const formatted = handler.serialize(target);
      this.langCache.set(key, formatted);
      return formatted;
    }

    return target;
  }

  private getCacheKey(lang: string, id: string) {
    return `langAdaptor#${lang}_${id}`;
  }

  registerLang(lang: string, handler: LanguageHandler) {
    if (this.langHandlers.has(lang)) {
      return;
    }

    const _start = performance.now();
    this.langCache.clear();
    this.langHandlers.set(lang, handler);
    console.log(`language adaptor for ${handler.name} installed, cost ${performance.now() - _start}ms`);
  }

  formatString(userInput: string, target: string, config: SerializeConfig) {
    let formatted = target;

    if (this.langHandlers.size > 0) {
      const { lang, id } = config;
      if (typeof lang !== "undefined") {
        formatted = this.formatStringWithLang(id, userInput, target, lang);
      } else {
        formatted = Array.from(this.langHandlers.keys()).reduce(
          (formatted, lang) => this.formatStringWithLang(id, userInput, formatted, lang),
          target,
        );
      }
    }

    return formatted;
  }
}

export const langAdaptor = new LanguageAdaptor();
