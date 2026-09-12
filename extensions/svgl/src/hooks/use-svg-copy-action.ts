import { Clipboard, Toast, showToast } from "@raycast/api";
import { fetchAndCopySvg } from "../utils/fetch";
import { useSvglExtension } from "../components/app-context";

export const useFetchSvgCopyAction = (svgId: number) => {
  const { addRecentSvgId } = useSvglExtension();
  return (url: string, showContent: string) => {
    addRecentSvgId(svgId);
    fetchAndCopySvg(url, showContent);
  };
};

export const useCopySvgUrlAction = (svgId: number) => {
  const { addRecentSvgId } = useSvglExtension();
  return (url: string, showContent: string) => {
    addRecentSvgId(svgId);
    Clipboard.copy(url);
    showToast({ style: Toast.Style.Success, title: showContent });
  };
};
