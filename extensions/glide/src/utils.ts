import * as glideBase from "@glideapps/tables";

export async function getApps(apiKey: string) {
  const glide = glideBase.withConfig({
    token: apiKey,
  });
  const apps = await glide.getApps();
  if (!apps) {
    throw new Error("No apps found");
  }
  console.log(
    "apps",
    apps.map((e) => e.props).filter((e) => e?.description),
  );
  if (!apps) {
    throw new Error("No apps found");
  }
  const enhancedApps = await Promise.all(
    apps.map(async (app) => {
      const manifest = await app.getManifest();
      return { name: app.name, id: app.id, description: app.props?.description, manifest };
    }),
  );
  return enhancedApps;
  // return apps?.map((e) => ({ id: e.id, name: e.name }));
}

export async function getApp(apiKey: string, id: string) {
  const glide = glideBase.withConfig({
    token: apiKey,
  });
  const app = glide.app(id);
  const manifest = await app.getManifest();
  // const tables = await app.getTables();
  return { manifest };
}
