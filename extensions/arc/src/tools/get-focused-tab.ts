import { getFocusedTab } from "../arc";

const tool = async () => {
  const tab = await getFocusedTab();
  if (!tab) {
    throw new Error("No tab is focused in the front Arc window.");
  }

  return tab;
};

export default tool;
