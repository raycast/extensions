// types/turndown.d.ts or just turndown.d.ts in your root
declare module "turndown" {
  export default class TurndownService {
    constructor(options?: TurndownService.Options);
    turndown(html: string): string;
    addRule(key: string, rule: TurndownService.Rule): TurndownService;
    keep(selector: string | string[]): TurndownService;
  }

  namespace TurndownService {
    interface Options {
      headingStyle?: "setext" | "atx";
      hr?: string;
      bulletListMarker?: string;
      codeBlockStyle?: "indented" | "fenced";
      emDelimiter?: string;
      strongDelimiter?: string;
      linkStyle?: "inlined" | "referenced";
      linkReferenceStyle?: "full" | "collapsed" | "shortcut";
    }

    interface Rule {
      filter: string | ((node: Node) => boolean);
      replacement: (content: string, node: Node, options: Options) => string;
    }
  }
}
