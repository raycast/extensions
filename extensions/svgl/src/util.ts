import { Clipboard, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import fetch from "node-fetch";

interface SvrgApiResponse {
  data: string;
}

const fetchSvg = async (url: string) => {
  const res = await fetch(url);
  return await res.text();
};

export const fetchAndCopySvg = async (url: string, showContent: string) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching svg file",
  });
  const svg = await fetchSvg(url);
  await toast.hide();

  Clipboard.copy(svg);
  showHUD(showContent);
  closeMainWindow();
};

export const fetchAndCopyReactComponent = async (url: string, name: string, tsx: boolean) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching React component",
  });
  const svg = await fetchSvg(url);

  try {
    const res = await fetch("https://svgl.app/api/svgs/svgr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: svg, name, typescript: tsx }),
    });

    await toast.hide();

    if (!res.ok) {
      throw new Error(`${res.statusText}`);
    }

    const { data: reactComponent } = (await res.json()) as SvrgApiResponse;
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
    }
    return;
  }
};
