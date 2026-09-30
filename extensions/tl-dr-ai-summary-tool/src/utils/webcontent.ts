import { debugableAxios } from "./httpclient";
import * as cheerio from "cheerio";

/**
 * Remove some useless html by regex, which costs less memory then cheerio
 * @param htmlString
 * @returns
 */
function removeStyleAndScriptTags(htmlString: string) {
  const styleTagRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  const scriptTagRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  const codeTagRegex = /<code[^>]*>[\s\S]*?<\/code>/gi;
  return htmlString.replace(styleTagRegex, "").replace(scriptTagRegex, "").replace(codeTagRegex, "");
}

export async function fetchContent(url: string) {
  return debugableAxios()
    .get(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })
    .then((response) => {
      // console.debug("original length=", response.data.length)
      let html = response.data;
      if (response.data.length > 100000) {
        html = removeStyleAndScriptTags(html);
        // console.debug("pre-removed length=", html.length)
      }
      // remove non-semantic tags to save tokens
      const $ = cheerio.load(html);
      const removedTags = [
        "script",
        "style",
        "code",
        "img",
        "video",
        "audio",
        "svg",
        "template",
        "button",
        "nav",
        "link",
        "form",
        "input",
        "footer",
        "select",
        "textarea",
        "pre",
        "embed",
        "object",
      ];
      removedTags.forEach((tag) => {
        $(tag).remove();
      });
      let title = $('meta[property="og:title"]').attr("content") ?? "";

      if (!title) {
        title = $("title").text();
      }
      let content: string | null = $("#page-content").text();
      if (!content) {
        // remove unused attributes
        $("*").each((index, element) => {
          // @ts-expect-error attribs is safe to use
          const attributes = element.attribs;
          for (const attr in attributes) {
            if (attr !== "id" && attr !== "content") {
              $(element).removeAttr(attr);
            }
          }
        });
        content = $("body").html();
      }
      if (!content) {
        content = $("html").html();
      }
      if (!content) {
        content = "<empty>";
      }
      // console.log("content length=", content?.length, content)
      return {
        title,
        content,
      };
    })
    .catch((error) => {
      console.error(error);
      return {
        title: "",
        content: "",
      };
    });
}
