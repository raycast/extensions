import fs from "fs";
import path from "path";
import { environment, getPreferenceValues } from "@raycast/api";
import { promisify } from "util";
import { execFile } from "child_process";
import { MutableRefObject } from "react";
import { findNodePath, findMmdcPath } from "./executables";
import { cleanupTempFile, createTempFile } from "./files";
import { Preferences } from "../types";
import { showFailureToast } from "@raycast/utils";

const execFilePromise = promisify(execFile);

/**
 * Clean Mermaid code by removing markdown fences if present
 */
export function cleanMermaidCode(mermaidCode: string): string {
  let cleanCode = mermaidCode;
  if (cleanCode.includes("```mermaid")) {
    const mermaidMatch = cleanCode.match(/```mermaid\s*\n([\s\S]*?)```+/);
    if (mermaidMatch && mermaidMatch[1]) {
      cleanCode = mermaidMatch[1];
    }
  }
  return cleanCode;
}

/**
 * Generate diagram using execFile with explicit Node.js path
 */
async function generateDiagramWithExplicitNode(
  nodePath: string,
  mmdcPath: string,
  inputFile: string,
  outputPath: string,
  theme: string,
  tempFileRef: MutableRefObject<string | null>,
  timeout: number,
): Promise<string> {
  // Define a helper function for cleanup operations
  const cleanupResources = (filePath: string | null) => {
    if (filePath) {
      cleanupTempFile(filePath);
    }
    tempFileRef.current = null;
  };

  try {
    console.log(`Executing: ${nodePath} ${mmdcPath} with input ${inputFile} and output ${outputPath}`);

    // Prepare arguments for mmdc
    const args = [mmdcPath, "-i", inputFile, "-o", outputPath, "-t", theme, "-b", "transparent", "--scale", "2"];

    // Set environment with extended PATH to help find dependencies
    const env = {
      ...process.env,
      NODE_OPTIONS: "--max-old-space-size=4096",
      PATH: `${path.dirname(nodePath)}${path.delimiter}/usr/local/bin${path.delimiter}/opt/homebrew/bin${path.delimiter}${process.env.PATH || ""}`,
    };

    // Execute Node.js with mmdc as an argument
    await execFilePromise(nodePath, args, { env, timeout });

    if (!fs.existsSync(outputPath)) {
      cleanupResources(inputFile);
      throw new Error(`Output file not found`);
    }

    // Clean up temporary .mmd file
    cleanupResources(tempFileRef.current);

    return outputPath;
  } catch (error: unknown) {
    console.error("Command execution failed:", error);

    // Clean up temporary files using the helper function
    cleanupResources(inputFile);

    // Log the full error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Full error details:", errorMessage);

    // Parse common error patterns for user-friendly messages
    if (errorMessage.includes("ETIMEDOUT")) {
      throw new Error(`Diagram generation timed out. Try increasing the timeout in preferences.`);
    } else if (errorMessage.includes("UnknownDiagramError") || errorMessage.includes("No diagram type detected")) {
      throw new Error("Invalid Mermaid syntax. Please check your diagram code.");
    } else if (errorMessage.includes("syntax error")) {
      throw new Error("Mermaid syntax error. Please check your diagram code for mistakes.");
    } else if (errorMessage.includes("Command failed")) {
      throw new Error("Failed to execute Mermaid CLI. Please check your installation.");
    } else {
      throw new Error("Failed to generate diagram. Please verify your Mermaid syntax.");
    }
  }
}

/**
 * Generate Mermaid diagram using explicit Node.js path and execFile
 */
export async function generateMermaidDiagram(
  mermaidCode: string,
  tempFileRef: MutableRefObject<string | null>,
): Promise<string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const cleanCode = cleanMermaidCode(mermaidCode);

    // Create temporary file with mermaid code
    const tempFile = createTempFile(cleanCode, "mmd");
    tempFileRef.current = tempFile;

    // Create output path
    const outputPath = path.join(environment.supportPath, `diagram-${Date.now()}.${preferences.outputFormat}`);

    console.log(`Generating diagram, theme: ${preferences.theme}, format: ${preferences.outputFormat}`);

    // Find Node.js path
    let nodePath;
    try {
      nodePath = await findNodePath();
      console.log("Using Node.js at:", nodePath);
    } catch (error) {
      console.error("Failed to find Node.js:", error);
      const errorMessage = "Could not find Node.js installation. Please make sure Node.js is installed.";
      await showFailureToast(error, {
        title: "Node.js Not Found",
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    // Find mmdc path
    const mmdcPath = await findMmdcPath(preferences);
    console.log("Using mmdc at:", mmdcPath);

    // Get timeout from preferences and convert to number in milliseconds
    const timeoutValue = preferences.generationTimeout || 10; // use 10 as default
    const timeoutInMs = (typeof timeoutValue !== "number" || timeoutValue <= 0 ? 10 : timeoutValue) * 1000;

    // Generate the diagram using execFile with explicit Node.js path
    return await generateDiagramWithExplicitNode(
      nodePath,
      mmdcPath,
      tempFile,
      outputPath,
      preferences.theme,
      tempFileRef,
      timeoutInMs,
    );
  } catch (error) {
    // Handle errors at the top level
    console.error("Diagram generation error:", error);

    if (error instanceof Error) {
      // If it is an error that has been resolved, display the corresponding error message
      await showFailureToast({
        title: "Diagram Generation Failed",
        message: error.message,
      });
      throw error; // Still throws an error to let the caller know the operation failed
    } else {
      // For unexpected errors
      await showFailureToast(error, {
        title: "Diagram Generation Failed",
        message: "An unexpected error occurred during diagram generation.",
      });
      throw new Error("An unexpected error occurred during diagram generation.");
    }
  }
}
