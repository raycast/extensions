import { getSelectedText, Clipboard } from "@raycast/api";
import { isEmpty } from "./utils";

export enum ItemType {
  TEXT = "Text",
  URL = "URL",
  EMAIL = "Email",
  NULL = "",
}

export enum ItemSource {
  SELECTED = "Selected",
  CLIPBOARD = "Clipboard",
  ENTER = "Enter",
  NULL = "",
}

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
  setType(type: ItemType = ItemType.NULL) {
    this.type = type;
    return this;
  }
}

const clipboard = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};

export const fetchItemInput = () => {
  const itemInput = new ItemInput();
  return getSelectedText()
    .then(async (text) =>
      !isEmpty(text)
        ? itemInput.setContent(text.substring(0, 9999)).setSource(ItemSource.SELECTED).setType()
        : itemInput
            .setContent(String(await clipboard()))
            .setSource(ItemSource.CLIPBOARD)
            .setType()
    )
    .catch(async () =>
      itemInput
        .setContent(String(await clipboard()))
        .setSource(ItemSource.CLIPBOARD)
        .setType()
    )
    .then((item) =>
      !isEmpty(item.content) ? itemInput : itemInput.setContent("").setSource(ItemSource.NULL).setType()
    )
    .catch(() => itemInput.setContent("").setSource(ItemSource.NULL).setType());
};
