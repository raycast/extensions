import { getFrontmostApplication } from "@raycast/api";

async function waitUntilAppIsOpen(appPath: string, onOpen?: () => void) {
  const app = await getFrontmostApplication();
  console.log("App is", app.path);
  if (app.path !== appPath) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await waitUntilAppIsOpen(appPath, onOpen);
  } else {
    onOpen?.();
    return;
  }
}

export { waitUntilAppIsOpen };
