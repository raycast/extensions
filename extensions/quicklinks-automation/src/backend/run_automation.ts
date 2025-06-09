import { LocalStorage, open } from "@raycast/api";

const runAutomation = async (automation: string) => {
  const quicklinks = await LocalStorage.getItem(automation).then((data) => {
    if (!data) {
      console.error(`No automation named '${automation}' found.`);
      throw new Error(`No automation named '${automation}' found.`);
    }
    const quicklinks = JSON.parse(data as string).values as string[];
    return quicklinks;
  });

  if (quicklinks.length === 0) {
    console.error("No quicklinks provided");
    throw new Error("No quicklinks provided");
  }

  for (const link of quicklinks) {
    await open(link);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 1 second before opening the next link
  }

  return;
};

export { runAutomation };
