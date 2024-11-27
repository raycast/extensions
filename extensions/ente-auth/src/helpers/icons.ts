import { Cache } from "@raycast/api";
import axios, { AxiosResponse } from "axios";
import * as icons from "simple-icons";
import { type SimpleIcon } from "simple-icons";
import { stripServiceName } from "../constants/string";

const iconsDatabaseUrl =
  "https://raw.githubusercontent.com/ente-io/ente/refs/heads/main/auth/assets/custom-icons/_data/custom-icons.json";
const enteCustomIconsDb =
  "https://raw.githubusercontent.com/ente-io/ente/refs/heads/main/auth/assets/custom-icons/icons/";

async function cacheImages(title: string, svgData: string): Promise<void> {
  const cache = new Cache();
  const cachedIcons = JSON.parse(cache.get("icons") || "[]");

  cachedIcons.push({ title, data: svgData });
  cache.set("icons", JSON.stringify(cachedIcons));
}

async function getEnteCustomIcon(name: string): Promise<string | undefined> {
  try {
    const response: AxiosResponse = await axios.get(iconsDatabaseUrl);

    if (response.status === 200) {
      const enteCustomIcons = response.data;

      const normalizedName = name.toLowerCase();

      const matchingIcon = enteCustomIcons.icons?.find((icon: any) => {
        const iconSlug = icon.slug?.toLowerCase();
        const iconTitle = icon.title.toLowerCase();
        const altNames = (icon.altNames || []).map((altName: string) => altName.toLowerCase());

        return normalizedName === iconTitle || normalizedName === iconSlug || altNames.includes(normalizedName);
      });

      if (matchingIcon) {
        const svgResponse: AxiosResponse = await axios.get(
          `${enteCustomIconsDb}${matchingIcon.slug?.toLowerCase()}.svg`,
        );
        if (svgResponse.status === 200) {
          await cacheImages(matchingIcon.slug, svgResponse.data);
          return svgResponse.data;
        } else {
          console.error(`Failed to fetch the SVG icon: ${svgResponse.status}`);
        }
      }
    } else {
      console.error(`Failed to fetch custom icons: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error fetching custom icon: ${error}`);
  }
  return undefined;
}

export const getSimpleIconIcons = (serviceName: string): string | SimpleIcon | undefined => {
  serviceName = stripServiceName(serviceName);

  for (const key in icons) {
    if (icons[key as keyof typeof icons].slug === serviceName) {
      return icons[key as keyof typeof icons].svg;
    }
  }

  return undefined;
};

// Example usage
getEnteCustomIcon("battlenet").then((data) => {
  if (data) {
    console.log("Ente Custom Icon SVG: ", data);
  } else {
    console.log("Custom icon not found.");
  }
});
