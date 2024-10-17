import { showToast, Toast } from "@raycast/api";

export const TE_Notion_undefined = () => {
  showToast({
    title: "Your Notion account is undefined. Make sure you have correctly connected your Notion account",
    style: Toast.Style.Animated,
  });
};
