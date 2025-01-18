declare module "turndown" {
  export default class TurndownService {
    constructor(options?: TurndownOptions);
    addRule(key: string, rule: TurndownRule): void;
    use(plugins: TurndownPlugin[]): void;
    turndown(html: string): string;
  }

  interface TurndownOptions {
    headingStyle?: "setext" | "atx";
    hr?: string;
    bulletListMarker?: "-" | "*" | "+";
    codeBlockStyle?: "indented" | "fenced";
    fence?: "```" | "~~~";
    emDelimiter?: "_" | "*";
    strongDelimiter?: "__" | "**";
    linkStyle?: "inlined" | "referenced";
    linkReferenceStyle?: "full" | "collapsed" | "shortcut";
  }

  interface TurndownRule {
    filter: string | string[] | ((node: HTMLElement) => boolean);
    replacement(content: string, node: HTMLElement): string;
  }

  type TurndownPlugin = (service: TurndownService) => void;
}
