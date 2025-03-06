import fetch from "node-fetch";
import path from "node:path";
import { escape, unescape } from "node:querystring";
import { URL } from "node:url";
import { useMemo, useRef } from "react";

import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { Content, Result } from "@/types";

import matter = require("gray-matter");

const contentApiURL = "https://api.github.com/repos/mdn/content/contents";
const translatedContentApiURL = "https://api.github.com/repos/mdn/translated-content/contents";

const cleanupContent = (raw: string, res: Result): string => {
  const file = matter(raw);

  let content = file.content;

  // Remove Ref tags
  content = content.replace(/{{\s?(cssref|MathML|JSRef)\s?}}/gim, "");

  // {{jsxref(“RegExp/n”, “RegExp.$1, …, RegExp.$9”)}}
  content = content.replace(/{{jsxref\("([^"]+)", "([^"]+)"\)}}/gim, "`$1`, `$2`");

  // Find all {{cssxref("...")}} and mreplace with just a name
  content = content.replace(/{{(cssxref|jsxref)\("([^"]+)"\)}}/gim, "`$2`");

  // {{js_property_attributes(1[,..])}} remove
  content = content.replace(/{{js_property_attributes\(\d+(,\s?\d+)*\)}}/gim, "");

  // Replace all samples
  content = content.replace(/{{Embed(Live|Interactive)(Sample|Example)\("([^"]+)"\)}}/gim, "`See page in browser`");

  // fix samples like {{EmbedLiveSample(“Complete_example”, 230, 250)}}
  content = content.replace(/{{EmbedLiveSample\("([^"]+)"(,\s?(\d+)){0,2}\)}}/gim, "`See sample - page in browser`");

  // fix samples like {{EmbedLiveSample(‘Comparing different length units’, ‘100%’, 700)}}
  content = content.replace(/{{EmbedLiveSample\("([^"]+)"(,\s?(\d+)){0,2}\)}}/gim, "`See sample - page in browser`");

  // {{EmbedInteractiveExample(...)}} - remove
  content = content.replace(/{{EmbedInteractiveExample\([^)]+\)}}/gim, "");

  // Replace all {{\s?Compat|Specifications\s?}} tags with a reference to See page in browser
  content = content.replace(/{{\s?(Compat|Specifications|cssinfo|csssyntax)\s?}}/gim, "`See page in browser`");

  // Replace all {{\s?Non-standard_header\s?}} tags with a message that it's non-standard
  content = content.replace(/{{\s?Non-standard_header\s?}}/gim, "`Non-standard` ");

  // Replace all {{\s?Deprecated_header\s?}} tags with a message that it's deprecated
  content = content.replace(/{{\s?Deprecated_header\s?}}/gim, "`Deprecated` ");

  // Deprecated inline {{deprecated_inline}}
  content = content.replace(/{{\s?deprecated_inline\s?}}/gim, "`deprecated` ");

  // Remove Sidebar tags
  content = content.replace(/{{(\w+)?Sidebar(\("([^"]+)"\))?}}/gim, "");

  // Find all links and replace the href with the full url
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, href) => {
    let url = href;
    if (href.startsWith("http")) {
      return match;
    }
    if (!href.startsWith("/")) {
      url = path.join(res.url, href);
    } else {
      url = path.join(new URL(res.url).origin, href);
    }
    return `[${text}](${url})`;
  });

  // Unescape any unicode characters (because all \u characters should be treated as code)
  // It's a dirty fix, but the Markdown parser doesn't seem to handle \u characters well
  content = content.replace(/\\u([\d\w]{4})/gim, (match, code) => {
    return unescape(escape(`\\u ${parseInt(code, 16).toString(16).toUpperCase()}`));
  });

  if (file.data.title) {
    content = `# ${file.data.title}\n\n${content}`;
  }

  return content;
};

export const useResult = (result: Result, locale: string) => {
  const abortable = useRef<AbortController>();
  const file =
    "/files" +
    result.mdn_url.toLowerCase().replace("::", "_doublecolon_").replace(":", "_colon_").replace("/docs/", "/") +
    "/index.md";
  const isEn = locale === "en-US";
  const url = `${isEn ? contentApiURL : translatedContentApiURL}${file}`;

  const { isLoading, data, revalidate, error } = useCachedPromise(
    async (url: string, result: Result) => {
      const response = await fetch(url, { signal: abortable.current?.signal });
      const data = (await response.json()) as unknown as Content;

      const content = Buffer.from(data?.content ?? "", (data?.encoding ?? "base64") as BufferEncoding).toString();

      return cleanupContent(content, result);
    },
    [url, result],
    {
      keepPreviousData: true,
      abortable,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: `Could not load MDN result content`,
          message: String(err),
        });
      },
    },
  );

  const content = useMemo(() => {
    return data || "";
  }, [data]);

  return { isLoading, content, file, isEn, revalidate, error };
};
