// HTML formatting also pulls in the JS and CSS plugins so embedded
// <script>/<style> blocks are formatted too.
import * as html from "prettier/plugins/html";
import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import * as postcss from "prettier/plugins/postcss";
import type { FormatOptions } from "../format-options";
import { runPrettier } from "./prettier-common";

export function formatHtml(code: string, options: FormatOptions): Promise<string> {
  return runPrettier(code, "html", [html, babel, estree, postcss], options);
}
