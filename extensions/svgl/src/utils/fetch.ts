import { Clipboard, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { Category, Svg } from "../type";
import { ONE_WEEK_MS, withCache } from "./cache";

export const APP_URL = "https://svgl.app";
export const API_URL = `${APP_URL}/api`;

interface SvrgApiResponse {
  data: string;
}

export const fetchSvgs = async () => {
  return withCache("svgl_svgs", async () => {
    const svgsResponse = await fetch(`${API_URL}/svgs`);
    if (!svgsResponse.ok) {
      throw new Error(`Error ${svgsResponse.status}, please try again later.`);
    }
    return (await svgsResponse.json()) as Svg[];
  });
};

export const fetchCategories = async () => {
  return withCache("svgl_categories", async () => {
    const categoriesResponse = await fetch(`${API_URL}/categories`);
    if (!categoriesResponse.ok) {
      throw new Error(`Error ${categoriesResponse.status}, please try again later.`);
    }
    return (await categoriesResponse.json()) as Category[];
  });
};

const fetchSvg = async (url: string) => {
  return withCache(
    `svgl_svg_${url}`,
    async () => {
      const res = await fetch(url);
      return await res.text();
    },
    ONE_WEEK_MS,
  );
};

const fetchReactComponent = async (url: string, name: string, tsx: boolean) => {
  const svg = await fetchSvg(url);
  return withCache(
    `svgl_svgr_${url}_${tsx}`,
    async () => {
      const res = await fetch(`${API_URL}/svgs/svgr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: svg, name, typescript: tsx }),
      });

      if (!res.ok) {
        throw new Error(`${res.statusText}`);
      }

      const { data } = (await res.json()) as SvrgApiResponse;
      return data;
    },
    ONE_WEEK_MS,
  );
};

export const fetchAndCopySvg = async (url: string, showContent: string) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching svg file",
  });
  try {
    const svg = await fetchSvg(url);
    await toast.hide();
    Clipboard.copy(svg);
    showHUD(showContent);
    closeMainWindow();
  } catch (error) {
    if (error instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch svg",
        message: error.message,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch svg",
      });
    }
  }
};

export const fetchAndCopyReactComponent = async (url: string, name: string, tsx: boolean) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching React component",
  });

  try {
    const reactComponent = await fetchReactComponent(url, name, tsx);
    await toast.hide();
    Clipboard.copy(reactComponent);
    showHUD(`Copied React component to clipboard`);
    closeMainWindow();
  } catch (error) {
    if (error instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch react component",
        message: error.message,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch react component",
      });
    }
    return;
  }
};
