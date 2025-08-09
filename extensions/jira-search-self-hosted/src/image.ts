import path from "path";
import { environment, showToast, Image, Toast, Icon } from "@raycast/api";
import { promises as fs } from "fs";
import { jiraFetch } from "./jira";
import { Warning } from "./exception";

interface ImageSpec {
  urlPath: string;
  imageType: string;
  key: string;
}

const imageDir = path.join(environment.supportPath, "image");

async function isFile(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

function filePath(image: ImageSpec): string {
  return path.join(imageDir, image.imageType, `${image.key}.png`);
}

async function downloadImage(image: ImageSpec, filePath: string): Promise<string> {
  const { dir } = path.parse(filePath);
  await fs.mkdir(dir, { recursive: true });
  const response = await jiraFetch(image.urlPath);
  const body = await response.arrayBuffer();
  await fs.writeFile(filePath, new DataView(body));
  return filePath;
}

function parseImageUrl(url: string): ImageSpec {
  type UrlMatcher = {
    pattern: RegExp;
    spec: (matchGroup: { [p: string]: string }) => ImageSpec;
  };
  const matcher: UrlMatcher[] = [
    {
      pattern: /.*\/universal_avatar\/view\/type\/(?<imageType>[a-z]+)\/avatar\/(?<key>[0-9]+)/i,
      spec: (g) => ({
        urlPath: `rest/api/3/universal_avatar/view/type/${g.imageType}/avatar/${g.key}?format=png&size=medium`,
        imageType: g.imageType,
        key: g.key,
      }),
    },
    {
      pattern: /\/images\/icons\/(?<imageType>[a-z]+)\/(?<key>[a-z.]+)/i,
      spec: (g) => ({
        urlPath: `images/icons/${g.imageType}/${g.key}?format=png&size=medium`,
        imageType: g.imageType,
        key: g.key,
      }),
    },
    {
      pattern: /\/secure\/projectavatar\?(?:pid=(?<pid>[0-9]+)&)?avatarId=(?<avatarId>[0-9]+)/i,
      spec: (g) => ({
        urlPath: `secure/projectavatar?${g.pid ? `pid=${g.pid}&` : ""}avatarId=${g.avatarId}`,
        imageType: "projectavatar",
        key: `${g.pid || "default"}_${g.avatarId}`,
      }),
    },
    {
      pattern:
        /\/secure\/useravatar\?(?:size=(?<size>[a-z]+)&)?(?:ownerId=(?<ownerId>[^&]+)&)?avatarId=(?<avatarId>[0-9]+)/i,
      spec: (g) => ({
        urlPath: `secure/useravatar?${g.size ? `size=${g.size}&` : ""}${
          g.ownerId ? `ownerId=${g.ownerId}&` : ""
        }avatarId=${g.avatarId}`,
        imageType: "useravatar",
        key: `${g.ownerId || "default"}_${g.avatarId}`,
      }),
    },
    {
      pattern:
        /\/secure\/viewavatar\?size=(?<size>[a-z]+)&avatarId=(?<avatarId>[0-9]+)&avatarType=(?<avatarType>[a-z]+)/i,
      spec: (g) => ({
        urlPath: `secure/viewavatar?size=${g.size}&avatarId=${g.avatarId}&avatarType=${g.avatarType}`,
        imageType: g.avatarType,
        key: `${g.avatarId}`,
      }),
    },
  ];
  const imgSpec = matcher
    .map((m) => ({ matcher: m, match: url.match(m.pattern) }))
    .map((m) => (m.match && m.match.groups ? m.matcher.spec(m.match.groups) : undefined))
    .find((imgSpec) => imgSpec !== undefined);
  if (!imgSpec) {
    console.warn(`Using default icon for unexpected path: ${url}`);
    return {
      urlPath: url,
      imageType: "default",
      key: `default_${Date.now()}`,
    };
  }
  return imgSpec;
}

export async function jiraImage(url: string): Promise<Image.ImageLike | undefined> {
  try {
    const imageSpec = parseImageUrl(url);
    const path = filePath(imageSpec);
    const isAvailable = await isFile(path);
    return isAvailable ? path : await downloadImage(imageSpec, path);
  } catch (e) {
    if (e instanceof Warning) {
      console.warn(e);
      return Icon.Circle;
    } else {
      console.error(e);
      return Icon.Circle;
    }
  }
}

export default async function ClearImageCache() {
  await fs.rm(imageDir, { force: true, recursive: true });
  await showToast({
    style: Toast.Style.Success,
    title: "Image Cache cleared",
    message: "Image will be reloaded on next search",
  });
}
