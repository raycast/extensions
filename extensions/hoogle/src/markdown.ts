import { Parser } from "htmlparser2";
import { Handler } from "htmlparser2/lib/Parser";

type ListType = "ul" | "ol";

export function htmlToMarkdown(html: string) {
  const parts: string[] = [];
  let innerText = 0;
  const tagStack: string[] = [];
  const listStack: ListType[] = [];

  const handler: Partial<Handler> = {
    onopentagname(name: string) {
      tagStack.push(name);
      if (innerText == 0) {
        switch (name) {
          case "tt":
          case "a":
            parts.push("`");
            innerText++;
            break;

          case "b":
            parts.push("**");
            break;

          case "i":
            parts.push("_");
            break;

          case "pre":
            parts.push("\n```");
            innerText++;
            break;

          case "ul":
          case "ol":
            listStack.push(name);
            break;

          case "h1":
          case "h2":
          case "h3":
          case "h4":
            parts.push(`\n${"#".repeat(parseInt(name.charAt(1)))} `);
            break;

          case "li":
            switch (listStack[listStack.length - 1]) {
              case "ol":
                parts.push("\n1. ");
                break;

              case "ul":
                parts.push("\n* ");
                break;
            }
            break;
        }
      } else {
        innerText++;
      }
    },

    ontext(text: string) {
      if (tagStack.includes("tt")) {
        text = text.replace("\n", " ");
      }
      parts.push(text);
    },

    onclosetag(name: string) {
      tagStack.pop();
      if (innerText > 0) {
        innerText--;
        if (innerText == 0) {
          switch (name) {
            case "tt":
            case "a":
              parts.push("`");
              break;

            case "pre":
              parts.push("```\n");
              break;
          }
        }
      } else {
        switch (name) {
          case "ul":
          case "ol":
            listStack.pop();
            break;

          case "b":
            parts.push("**");
            break;

          case "i":
            parts.push("_");
            break;

          case "h1":
          case "h2":
          case "h3":
          case "h4":
            parts.push("\n");
            break;
        }
      }
    },
  };
  const parser = new Parser(handler);
  parser.write(html);
  parser.end();

  return parts.join("");
}

export function htmlToText(html: string) {
  const parts: string[] = [];
  const handler: Partial<Handler> = {
    ontext(data) {
      parts.push(data);
    },
  };
  const parser = new Parser(handler);
  parser.write(html);
  parser.end();

  return parts.join("");
}
