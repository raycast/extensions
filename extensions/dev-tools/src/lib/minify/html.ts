import { minify as htmlMinify } from "html-minifier-terser";
import type { MinifyOptions } from "../minify-options";

export function minifyHtml(code: string, options: MinifyOptions): Promise<string> {
  if (!code.trim()) return Promise.resolve("");
  // html-minifier-terser minifies inline <script>/<style> via terser/clean-css.
  return htmlMinify(code, {
    collapseWhitespace: options.htmlCollapseWhitespace,
    removeComments: options.removeComments,
    removeOptionalTags: options.htmlRemoveOptionalTags,
    removeRedundantAttributes: options.htmlRemoveRedundantAttributes,
    minifyCSS: options.htmlMinifyInlineCss ? { level: options.cssLevel } : false,
    minifyJS: options.htmlMinifyInlineJs
      ? { mangle: options.mangle, compress: { drop_console: options.dropConsole, drop_debugger: true } }
      : false,
    keepClosingSlash: true,
  });
}
