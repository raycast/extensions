import * as glideBase from "@glideapps/tables";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGlideProps(obj: any) {
  // just a small hack to get the props because its private in the lib class
  return obj.props as { description: string };
}

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
    apps.map((e) => getGlideProps(e)).filter((e) => e?.description),
  );
  if (!apps) {
    throw new Error("No apps found");
  }
  const enhancedApps = await Promise.all(
    apps.map(async (app) => {
      const manifest = await app.getManifest();
      return { name: app.name, id: app.id, description: getGlideProps(app)?.description, manifest };
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
