import { showHUD, Clipboard } from "@raycast/api";
import MarkdownIt from "markdown-it";

export default async function main() {
  const md = new MarkdownIt();
  const text = await Clipboard.readText();
  const defaultImgRender = md.renderer.rules.image;
  const defaultParagraphRender =
    md.renderer.rules.paragraph_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.paragraph_open = function (tokens, idx, options, env, self) {
    // If the paragraph contains an image, don't render <p> tags
    const tokenContent = tokens[idx + 1].content;
    if (tokenContent && tokenContent.includes("![")) {
      return "";
    } else {
      // For all other paragraphs, use the default renderer
      return defaultParagraphRender(tokens, idx, options, env, self);
    }
  };

  md.renderer.rules.paragraph_close = function (tokens, idx, options, env, self) {
    const tokenContent = tokens[idx - 1].content;
    if (tokenContent && tokenContent.includes("![")) {
      return "";
    } else {
      return "</p>\n";
    }
  };

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];

    if (typeof token.attrPush === "function") {
      token.attrPush(["width", "300"]);
    }

    if (typeof defaultImgRender === "function") {
      return defaultImgRender(tokens, idx, options, env, self);
    } else {
      return "";
    }
  };

  await Clipboard.copy(md.render(text || ""));
  await showHUD("Text in the clipboard has been reformtted to HTML");
}
