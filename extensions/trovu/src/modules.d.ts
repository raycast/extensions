// ext/raycast/src/modules.d.ts

declare module "../../../src/js/modules/Env.js" {
  export interface Env {
    populate(params: Record<string, string>): Promise<void>;
    data: object;
  }

  const Env: Env;
  export default Env;
}

declare module "../../../src/js/modules/SuggestionsGetter.js" {
  export interface Suggestion {
    argumentCount: string;
    argumentString: string;
    arguments?: object;
    description?: string;
    examples?: object[];
    key: string;
    keyword: string;
    namespace: string;
    reachable?: boolean;
    tags?: string[];
    title?: string;
    url: string;
  }

  export class SuggestionsGetter {
    getSuggestions(query: string): Suggestion[];
  }

  export default SuggestionsGetter;
}
