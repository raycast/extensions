import { getFocusedTab } from "../cra";

const tool = async () => {
  const tab = await getFocusedTab();
  if (!tab) {
    throw new Error("No tab is focused in the front Cra window.");
  }

  return tab;
};

export default tool;
