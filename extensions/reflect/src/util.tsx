import { getApplications } from "@raycast/api";

export async function checkReflect() {
  const apps = await getApplications();
  const reflectInstalled = apps.find(
    (app) => app.bundleId === "app.reflect.ReflectDesktop"
  );
  if (reflectInstalled) return true;

  return false;
}

export const reflectDownload = "https://reflect.app/download";
