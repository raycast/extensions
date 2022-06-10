import { environment } from "@raycast/api";
import fileUrl from "file-url";
import { numberPathList } from "./constants";

export const getNumberCanvas = (iconTheme: string, number: number) => {
  const raycastTheme = environment.theme;
  let _iconTheme = iconTheme;

  if (_iconTheme == "simple" && raycastTheme == "dark") {
    _iconTheme = _iconTheme + "-dark";
  }
  const _numberPathList = numberPathList(_iconTheme);

  const _numberList = (number + "").split("");
  const numberPaths: string[] = [];
  for (const _number of _numberList) {
    _numberPathList.forEach((numberPathValue) => {
      if (numberPathValue.value === _number) {
        numberPaths.push(`![](${fileUrl(numberPathValue.path)})`);
        return;
      }
    });
  }
  return numberPaths.join("\n");
};
