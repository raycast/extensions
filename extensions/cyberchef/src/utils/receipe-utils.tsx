import { Clipboard, open, getSelectedText, Toast, showToast, popToRoot } from "@raycast/api";
import queryString from "query-string";
import { Props } from "./types";

export const runCyberchefRecipe = async ({ recipe }: Props) => {
  const text = await getText();

  if (text && text.length > 0) {
    const input = Buffer.from(text).toString("base64");
    const queryParams = queryString.stringify({
      recipe,
      input,
    });
    open(`https://gchq.github.io/CyberChef/#${queryParams}`);
    popToRoot({ clearSearchBar: true });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Input not found",
    });
  }
};

export const getText = async (): Promise<string | undefined> => {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text) ? text : await Clipboard.readText()))
    .catch(async () => await Clipboard.readText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
};

const isEmpty = (s: string | null | undefined): boolean => {
  return !(s != null && String(s).length > 0);
};

export const buildUrl = (recipe: string, args: string | undefined, data: string): string => {
  const input = Buffer.from(data).toString("base64");
  const queryParams = queryString.stringify({
    recipe,
    input,
    args: args || "()",
  });

  return `https://gchq.github.io/CyberChef/#${queryParams}`;
};
