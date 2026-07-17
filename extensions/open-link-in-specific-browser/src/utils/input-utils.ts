import { getSelectedText, Clipboard, getFrontmostApplication } from "@raycast/api";
import { isEmpty, isUrl, urlIPBuilder } from "./common-utils";
import { isIP } from "net";
import { ItemSource, ItemType } from "../types/types";
import { chromiumBrowserNames, webkitBrowserNames } from "./constants";
import { getChromiumBrowserPath, getWebkitBrowserPath } from "./applescript-utils";

export class ItemInput {
  content: string;
  source: ItemSource;
  type: ItemType;

  constructor(content = "", source = ItemSource.NULL, type = ItemType.NULL) {
    this.content = content;
    this.source = source;
    this.type = type;
  }

  setContent(content = "") {
    this.content = content;
    return this;
  }
  setSource(source: ItemSource = ItemSource.NULL) {
    this.source = source;
    return this;
  }
  setType() {
    const trimText = this.content.trim();
    if (isEmpty(trimText)) {
      this.content = "";
      this.source = ItemSource.NULL;
      this.type = ItemType.NULL;
    } else {
      if (isUrl(trimText)) {
        let url;
        if (isIP(trimText)) {
          if (trimText == "127.0.0.1") {
            url = "http://www." + trimText;
          } else {
            url = urlIPBuilder("http://", trimText);
          }
        } else {
          url = /^https?:\/\//g.test(trimText) ? trimText : "https://" + trimText;
        }
        this.content = url;
        this.type = ItemType.URL;
      } else {
        this.content = trimText;
        this.type = ItemType.TEXT;
      }
    }
    return this;
  }
}

const clipboard = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};

export const fetchItemInput = async () => {
  const itemInput = new ItemInput();
  const inputText = await getSelectedText()
    .then(async (text) =>
      !isEmpty(text)
        ? itemInput.setContent(text.substring(0, 9999)).setSource(ItemSource.SELECTED).setType()
        : itemInput
            .setContent(String(await clipboard()))
            .setSource(ItemSource.CLIPBOARD)
            .setType(),
    )
    .catch(async () =>
      itemInput
        .setContent(String(await clipboard()))
        .setSource(ItemSource.CLIPBOARD)
        .setType(),
    )
    .then((item) =>
      !isEmpty(item.content) ? itemInput : itemInput.setContent("").setSource(ItemSource.NULL).setType(),
    )
    .catch(() => itemInput.setContent("").setSource(ItemSource.NULL).setType());

  if (inputText.type !== ItemType.URL) {
    const frontmostAppUrl = await getFrontmostAppUrl();
    if (!isEmpty(frontmostAppUrl)) {
      return new ItemInput(frontmostAppUrl, ItemSource.FRONTMOSTAPP, ItemType.URL);
    }
  }
  return inputText;
};

export const getFrontmostAppUrl = async () => {
  const frontmostApp = await getFrontmostApplication();
  // get browser web page url
  let url = "";
  if (webkitBrowserNames.includes(frontmostApp.name)) {
    url = await getWebkitBrowserPath(frontmostApp.name);
  } else if (chromiumBrowserNames.includes(frontmostApp.name)) {
    url = await getChromiumBrowserPath(frontmostApp.name);
  }
  return url;
};
