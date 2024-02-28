import { MJOptions } from "midjourney";
import "./fetch";

// taken from https://github.com/erictik/midjourney-api/blob/2cfc7c98349d438f8ffd1f8201b6c76a3ef3b932/src/utils/index.ts
export function content2progress(content: string) {
  const spcon = content.split("**");
  if (spcon.length < 3) {
    return "";
  }
  content = spcon[2];
  const regex = /\(([^)]+)\)/; // matches the value inside the first parenthesis
  const match = content.match(regex);
  let progress = "";
  if (match) {
    progress = match[1];
  }
  return progress;
}

// taken from https://github.com/erictik/midjourney-api/blob/2cfc7c98349d438f8ffd1f8201b6c76a3ef3b932/src/utils/index.ts
export function UriToHash(uri: string) {
  return uri.split("_").pop()?.split(".")[0] ?? "";
}

// taken from https://github.com/erictik/midjourney-api/blob/2cfc7c98349d438f8ffd1f8201b6c76a3ef3b932/src/utils/index.ts
export const formatOptions = (components: any) => {
  let data: MJOptions[] = [];
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    if (component.components && component.components.length > 0) {
      const item = formatOptions(component.components);
      data = data.concat(item);
    }
    if (!component.custom_id) continue;
    data.push({
      type: component.type,
      style: component.style,
      label: component.label || component.emoji?.name,
      custom: component.custom_id,
    });
  }
  return data;
};

export function generateGUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
