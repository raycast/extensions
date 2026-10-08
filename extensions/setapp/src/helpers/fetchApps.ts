import { Cache } from "@raycast/api";
import fetch from "node-fetch";
import { SetappResponse, SetappApp, App } from "../types";
import fs from "fs";
import path from "path";
import plist from "plist";

const cache = new Cache();

interface InstalledApp {
  bundle_id: string;
  path: string;
}

async function fetchApps() {
  const response = await fetch("https://store.setapp.com/store/api/v8/en");
  const json: SetappResponse = (await response.json()) as SetappResponse;

  const vendors = [];
  const apps: App[] = [];

  const appObj = (app: SetappApp, vendor_id: number, type: string) => {
    return {
      id: app.id,
      name: app.attributes.name,
      icon: app.attributes.icon,
      bundle_id: app.attributes.bundle_id,
      sharing_url: app.attributes.sharing_url,
      marketing_url: app.attributes.marketing_url,
      tag_line: app.attributes.tag_line,
      description: app.attributes.description,
      vendor_id: vendor_id,
      type,
    };
  };

  const vendorsData = json.data.relationships.vendors.data;
  for (let idx = 0; idx < vendorsData.length; idx++) {
    const vendor = vendorsData[idx];
    vendors.push({
      id: vendor.id,
      name: vendor.attributes.name,
    });
    vendor.relationships.applications.data.forEach((app: SetappApp) => {
      apps.push(appObj(app, vendor.id, "app"));
    });
    vendor.relationships.mobile_applications.data.forEach((app: SetappApp) => {
      apps.push(appObj(app, vendor.id, "mobile_app"));
    });
  }

  return apps;
}

async function isSetappInstalled() {
  const setappPath = "/Applications/Setapp.app";
  try {
    await fs.promises.access(setappPath);
    return true;
  } catch (error) {
    return false;
  }
}

async function getInstalledApps() {
  const setappPath = "/Applications/Setapp";

  try {
    const files = await fs.promises.readdir(setappPath);
    const apps: InstalledApp[] = [];

    for (let i = 0; i < files.length; i++) {
      const filename = files[i].trim();
      if (filename === "Icon") {
        continue;
      }
      const filePath = path.join(setappPath, filename, "Contents", "Info.plist");

      try {
        const info = plist.parse(fs.readFileSync(filePath, "utf8")) as plist.PlistObject;
        if (info) {
          apps.push({ bundle_id: info.CFBundleIdentifier as string, path: path.join(setappPath, filename) });
        }
      } catch (err) {
        console.error(err);
      }
    }
    return apps;
  } catch (error) {
    console.error(error);
    return [];
  }
}

const flagInstalledApps = (apps: App[], installedApps: InstalledApp[]) => {
  return apps.map((app) => {
    if (installedApps.map((ia) => ia.bundle_id).includes(app.bundle_id)) {
      return { ...app, installed: true, path: installedApps.find((ia) => ia.bundle_id === app.bundle_id)?.path };
    }
    return app;
  });
};

export async function getApps() {
  const apps = await fetchApps();
  const setappInstalled = await isSetappInstalled();
  cache.set("setappInstalled", setappInstalled.toString());

  const installedApps = await getInstalledApps();
  const appsWithInstalledFlag = flagInstalledApps(apps, installedApps);
  cache.set("apps", JSON.stringify(appsWithInstalledFlag));
  cache.set("lastSync", Date.now().toString());
  return apps;
}
