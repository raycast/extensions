import { LRUCache } from "lru-cache";

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
  private langCache = new Map<string, LRUCache<string, string>>();
  private langHandlers = new Map<string, LanguageHandler>();

  private formatStringWithLang(id: string, userInput: string, target: string, lang: string): string {
    const cache = this.langCache.get(lang)!;
    if (cache.has(id)) {
      if (process.env.NODE_ENV === "development") {
        console.log("cache hit", id);
      }
      return cache.get(id)!;
    }

    const handler = this.langHandlers.get(lang);
    if (handler && handler.check(target, userInput)) {
      const formatted = handler.serialize(target);
      cache.set(id, formatted);
      return formatted;
    }

    return target;
  }

  // delete for safety
  private removeCache(lang: string) {
    if (this.langCache.has(lang)) {
      this.langCache.get(lang)?.clear();
      this.langCache.delete(lang);
    }
  }

  registerLang(lang: string, handler: LanguageHandler) {
    if (this.langHandlers.has(lang)) {
      return;
    }

    this.removeCache(lang);
    this.langHandlers.set(lang, handler);
    this.langCache.set(lang, new LRUCache<string, string>({ max: 1000 }));
    console.log(`language adaptor for ${handler.name} installed`);
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
