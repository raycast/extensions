declare module "turndown" {
  // Minimal typing for TurndownService used in this project
  export default class TurndownService {
    constructor(opts?: { headingStyle?: string });
    addRule(
      name: string,
      rule: {
        filter: string | string[] | ((node: unknown) => boolean);
        replacement: (content: string, node?: unknown) => string;
      },
    ): void;
    turndown(input: string): string;
  }
}
