import { showToast, Toast } from "@raycast/api";
import { readFileSync, existsSync } from "fs";
import type { KibanaInstance, AllInstancesCache } from "../types";
import { buildAuthHeaders, fetchDataViews } from "./kibana-api";
import { saveAllInstancesCaches, CACHE_PATH } from "./cache";

/**
 * Refresh data-views for a single Kibana instance
 */
export async function refreshInstance(instance: KibanaInstance): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Fetching from ${instance.name}...`,
  });

  try {
    const headers = buildAuthHeaders(instance);
    const dataViews = await fetchDataViews(instance.url, headers);

    if (dataViews.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `No data views found in ${instance.name}`;
      return;
    }

    dataViews.sort((a, b) => {
      const nameA = (
        a.attributes?.name ||
        a.attributes?.title ||
        a.title ||
        ""
      ).toLowerCase();
      const nameB = (
        b.attributes?.name ||
        b.attributes?.title ||
        b.title ||
        ""
      ).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const newInstanceCache = {
      instance: {
        name: instance.name,
        url: instance.url,
        commonFields: instance.commonFields,
      },
      dataViews: dataViews.map((view, index) => ({
        number: index + 1,
        name:
          view.attributes?.name ||
          view.attributes?.title ||
          view.title ||
          "Untitled",
        title: view.attributes?.title || view.title || "Untitled",
        id: view.id,
      })),
    };

    // Load existing cache and merge with new instance data
    let allCaches: AllInstancesCache = {};

    if (existsSync(CACHE_PATH)) {
      try {
        const existing = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
        // Check if old format (single instance)
        if (
          existing.instance &&
          existing.dataViews &&
          !existing[Object.keys(existing)[0]]?.instance
        ) {
          // Convert old format to new
          allCaches = {
            [existing.instance.name]: existing,
          };
        } else {
          allCaches = existing;
        }
      } catch (error) {
        console.error("Error reading existing cache:", error);
      }
    }

    // Add or update this instance's cache
    allCaches[instance.name] = newInstanceCache;

    saveAllInstancesCaches(allCaches, CACHE_PATH);

    toast.style = Toast.Style.Success;
    toast.title = `Refreshed ${dataViews.length} data views`;
    toast.message = `From ${instance.name}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to fetch from ${instance.name}`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching data views:", error);
  }
}
