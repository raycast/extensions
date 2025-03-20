import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as yaml from "js-yaml";
import { cache, CACHE_KEY } from "./api";
import { Item } from "./types";

// Constants
const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/ccfddl/ccf-deadlines@main/";
const JSDELIVR_API_URL = "https://data.jsdelivr.com/v1/package/gh/ccfddl/ccf-deadlines@main/flat";
const CONFERENCE_PATH = "conference";

// Interface for jsDelivr API response
interface JsDelivrFile {
  name: string;
  hash: string;
  time: string;
  size: number;
}

// Function to fetch data from CDN
export async function fetchFromCDN(
  isManualRefresh = false,
  options: {
    onSuccess: (data: Item[]) => void;
    onError: (error: Error) => void;
    onFinish: () => void;
  },
) {
  try {
    // Dynamically import node-fetch
    const { default: fetch } = await import("node-fetch");

    console.log("Fetching conference data from CDN");

    // First, get the file listing from jsDelivr API
    console.log("Fetching file listing from jsDelivr API");
    const filesResponse = await fetch(JSDELIVR_API_URL);

    if (!filesResponse.ok) {
      showFailureToast({
        title: "Failed to fetch file listing",
        message: `jsDelivr API error: ${filesResponse.statusText}`,
      });
      return;
    }

    const filesData = await filesResponse.json();
    const files = filesData.files as JsDelivrFile[];

    // Filter for YAML files in the conference directory
    const yamlFiles = files.filter((file) => {
      return (
        file.name.startsWith(`/${CONFERENCE_PATH}/`) && file.name.endsWith(".yml") && file.name.split("/").length > 3
      ); // Ensure it's in a subdirectory of conference
    });

    console.log(`Found ${yamlFiles.length} YAML files in conference directories`);

    const allItems: Item[] = [];
    const fetchPromises: Promise<void>[] = [];

    // Process each YAML file in parallel
    for (const file of yamlFiles) {
      const fetchPromise = (async () => {
        try {
          // Extract category from file path
          const pathParts = file.name.split("/");
          const category = pathParts[2]; // conference/CATEGORY/filename.yml

          // Construct the CDN URL for this file
          const fileUrl = `${CDN_BASE_URL}${file.name.substring(1)}`; // Remove leading slash

          console.log(`Fetching YAML from: ${fileUrl} (Category: ${category})`);

          const yamlResponse = await fetch(fileUrl);

          if (!yamlResponse.ok) {
            console.error(`Failed to fetch ${fileUrl}: ${yamlResponse.statusText}`);
            showFailureToast({
              title: "Failed to Fetch YAML",
              message: `Failed to fetch ${file.name}: ${yamlResponse.statusText}`,
            });
            return;
          }

          const yamlText = await yamlResponse.text();

          try {
            const yamlContent = yaml.load(yamlText) as Item[];

            if (Array.isArray(yamlContent)) {
              console.log(`Successfully loaded ${yamlContent.length} items from ${file.name}`);
              allItems.push(...yamlContent);
            } else {
              console.log(`File ${file.name} does not contain an array of items`);
            }
          } catch (yamlError) {
            console.error(`Failed to parse YAML for ${file.name}:`, yamlError);
            showFailureToast({
              title: "Failed to Parse YAML",
              message: `Failed to parse YAML for ${file.name}: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`,
            });
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          showFailureToast({
            title: "Error Processing File",
            message: `Failed to process file ${file.name}: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
          });
        }
      })();

      fetchPromises.push(fetchPromise);
    }

    // Wait for all file fetches to complete
    await Promise.all(fetchPromises);

    console.log(`Completed processing all categories, found ${allItems.length} total items`);

    // If no items were found, throw an error
    if (allItems.length === 0) {
      showFailureToast({
        title: "No Conference Data Found",
        message: "No conference data found from CDN. Please try again later.",
      });
      return;
    }

    // Sort conferences within each item by year (descending)
    allItems.forEach((item) => {
      if (item.confs && Array.isArray(item.confs)) {
        item.confs.sort((a, b) => b.year - a.year);
      }
    });

    // Store in cache
    cache.set(CACHE_KEY, JSON.stringify(allItems));

    console.log(`Loaded ${allItems.length} conferences from CDN and cached`);

    // Call success callback
    options.onSuccess(allItems);

    // Show success toast when manually refreshed
    if (isManualRefresh) {
      showToast({
        style: Toast.Style.Success,
        title: "Data Refreshed",
        message: `Successfully loaded ${allItems.length} conferences`,
      });
    }
  } catch (error) {
    console.error("Failed to load conference data from CDN:", error);

    // Call error callback with the caught error
    options.onError(error instanceof Error ? error : new Error(String(error)));

    // Show error toast for manual refreshes
    if (isManualRefresh) {
      showToast({
        style: Toast.Style.Failure,
        title: "Refresh Failed",
        message: "Failed to refresh conference data",
      });
    }
  } finally {
    // Always call the finish callback
    options.onFinish();
  }
}
