declare module "turndown-plugin-gfm" {
  import { Options } from "turndown";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function gfm(turndownService: any, options?: Options): void;
}
