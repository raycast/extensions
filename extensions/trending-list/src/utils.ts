import { Image } from "@raycast/api";
import FormData from "form-data";

const getIcon = (index: number): Image.ImageLike => {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="${index <= 3 ? "#f26d5f" : "#ff8200"}" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
};

const formatNumber = (num: number) => {
  // 数字单位的对应关系
  const formats = [
    { value: 1e3, unit: "千" },
    { value: 1e4, unit: "万" },
    { value: 1e8, unit: "亿" },
  ];

  let format = null;
  for (let i = formats.length - 1; i >= 0; i--) {
    if (num >= formats[i].value) {
      format = formats[i];
      break;
    }
  }

  if (format) {
    const temp = Math.round(num / format.value);
    return temp + format.unit;
  }

  return num;
};

const getBody = (code = "zhihu") => {
  const formData = new FormData();
  formData.append("res", code);
  return formData as any;
};

export { formatNumber, getIcon, getBody };
