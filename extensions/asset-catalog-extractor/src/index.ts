import { showToast, Toast, getSelectedFinderItems, getApplications, open } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

// Promisify the exec function to use async/await
const execAsync = promisify(exec);

// Define the structure of the extraction result
type ExtractionResult =
  | {
      filePath: string;
      outputDir: string;
      fileCount: number;
    }
  | {
      filePath: string;
      error: string;
    };

/**
 * Recursively counts the number of files in a directory and its subdirectories
 * @param directory - The path to the directory to count files in
 * @returns The total number of files found
 */
function countFilesInDirectory(directory: string): number {
  let count = 0;
  const items = fs.readdirSync(directory);

  for (const item of items) {
    const fullPath = path.join(directory, item);
    if (fs.statSync(fullPath).isFile()) {
      count++;
    } else if (fs.statSync(fullPath).isDirectory()) {
      count += countFilesInDirectory(fullPath);
    }
  }

  return count;
}

/**
 * Extracts a single .car file using the Asset Catalog Tinkerer tool
 * @param filePath - The path to the .car file to extract
 * @param actPath - The path to the Asset Catalog Tinkerer executable
 * @returns An object containing the output directory path and the number of extracted files
 */
async function extractCarFile(filePath: string, actPath: string): Promise<{ outputDir: string; fileCount: number }> {
  // Generate a unique output directory name
  let outputDir = path.join(path.dirname(filePath), path.basename(filePath, ".car"));
  let index = 1;
  while (fs.existsSync(outputDir)) {
    outputDir = path.join(path.dirname(filePath), `${path.basename(filePath, ".car")} (${index})`);
    index++;
  }
  console.log("Output directory:", outputDir);

  // Construct the command to run the Asset Catalog Tinkerer tool
  const command = `"${actPath}" extract -i "${filePath}" -o "${outputDir}"`;
  console.log("Full command:", command);

  try {
    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    console.log("Command output:", stdout);
    if (stderr) {
      console.error("Command errors:", stderr);
    }
  } catch (error) {
    console.error("Command execution error:", error);
    throw new Error(
      `Failed to extract ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Count the number of extracted files
  const fileCount = countFilesInDirectory(outputDir);
  return { outputDir, fileCount };
}

/**
 * Main function to handle the extraction of .car files
 */
export default async function command() {
  try {
    console.log("Starting CAR file extraction process");

    // Get the files selected in Finder
    const selectedItems = await getSelectedFinderItems();
    console.log("Selected items:", selectedItems);

    // Check if any files are selected
    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select one or more .car files in Finder",
      });
      return;
    }

    // Filter for .car files only
    const carFiles = selectedItems.filter((item) => path.extname(item.path).toLowerCase() === ".car");

    // Check if any .car files are selected
    if (carFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No .car files selected",
        message: "Please select at least one .car file",
      });
      return;
    }

    // Find the Asset Catalog Tinkerer application
    const apps = await getApplications();
    const assetCatalogTinkerer = apps.find((app) => app.name === "Asset Catalog Tinkerer");
    console.log("Asset Catalog Tinkerer app:", assetCatalogTinkerer);

    // Check if Asset Catalog Tinkerer is installed
    if (!assetCatalogTinkerer) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Asset Catalog Tinkerer not found",
        message: "Please install Asset Catalog Tinkerer",
        primaryAction: {
          title: "Download Asset Catalog Tinkerer",
          onAction: () => open("https://github.com/insidegui/AssetCatalogTinkerer"),
        },
      });
      return;
    }

    // Construct the path to the Asset Catalog Tinkerer executable
    const actPath = path.join(assetCatalogTinkerer.path, "Contents/MacOS/act");
    console.log("act path:", actPath);

    // Check if the executable exists
    if (!fs.existsSync(actPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Asset Catalog Tinkerer executable not found",
        message: "The 'act' executable is missing. Please reinstall Asset Catalog Tinkerer.",
      });
      return;
    }

    // Show an initial toast to indicate the extraction process has started
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Extracting ${carFiles.length} catalog${carFiles.length > 1 ? "s" : ""}...`,
    });

    // Set up progress tracking
    let completedExtractions = 0;
    const updateProgress = () => {
      completedExtractions++;
      toast.message = `Processed ${completedExtractions} of ${carFiles.length} files`;
    };

    // Create an array of promises for parallel extraction
    const extractionPromises = carFiles.map(async (file) => {
      try {
        const result = await extractCarFile(file.path, actPath);
        updateProgress();
        return { filePath: file.path, ...result };
      } catch (error) {
        console.error(`Error extracting ${file.path}:`, error);
        updateProgress();
        return { filePath: file.path, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Wait for all extractions to complete
    const results: ExtractionResult[] = await Promise.all(extractionPromises);

    // Separate successful and failed extractions
    const successfulExtractions = results.filter(
      (r): r is ExtractionResult & { outputDir: string; fileCount: number } => "outputDir" in r,
    );
    const failedExtractions = results.filter((r): r is ExtractionResult & { error: string } => "error" in r);

    // Handle successful extractions
    if (successfulExtractions.length > 0) {
      const totalFiles = successfulExtractions.reduce((sum, r) => sum + r.fileCount, 0);
      toast.style = Toast.Style.Success;
      toast.title = "Extraction complete";
      toast.message = `Extracted ${totalFiles} files from ${successfulExtractions.length} catalog${successfulExtractions.length > 1 ? "s" : ""}`;

      // Add an action to open the extracted folder if only one file was processed
      if (successfulExtractions.length === 1) {
        toast.primaryAction = {
          title: "Open Extracted Folder",
          onAction: () => {
            open(successfulExtractions[0].outputDir);
          },
        };
      }
    }

    // Handle failed extractions
    if (failedExtractions.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to extract ${failedExtractions.length} catalog${failedExtractions.length > 1 ? "s" : ""}`,
        message: failedExtractions.map((f) => path.basename(f.filePath)).join(", "),
      });
    }

    console.log("Extraction results:", results);
  } catch (error) {
    // Handle any unexpected errors
    console.error("Detailed error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error extracting files",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
