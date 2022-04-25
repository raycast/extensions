import { environment } from "@raycast/api";
import fileUrl from "file-url";

const assetPath = environment.assetsPath;
const numberPathList = (theme: string) => {
  return [
    { value: "0", path: `${assetPath}/${theme}/0.png` },
    { value: "1", path: `${assetPath}/${theme}/1.png` },
    { value: "2", path: `${assetPath}/${theme}/2.png` },
    { value: "3", path: `${assetPath}/${theme}/3.png` },
    { value: "4", path: `${assetPath}/${theme}/4.png` },
    { value: "5", path: `${assetPath}/${theme}/5.png` },
    { value: "6", path: `${assetPath}/${theme}/6.png` },
    { value: "7", path: `${assetPath}/${theme}/7.png` },
    { value: "8", path: `${assetPath}/${theme}/8.png` },
    { value: "9", path: `${assetPath}/${theme}/9.png` },
  ];
};

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
