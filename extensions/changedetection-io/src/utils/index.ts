import { Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { instance_url } from "@/api";

export const watchIcon = (url: string): Image.ImageLike => getFavicon(url, { fallback: Icon.Globe });

export const getUrl = (suffix: string): string => new URL(suffix, instance_url).toString();
