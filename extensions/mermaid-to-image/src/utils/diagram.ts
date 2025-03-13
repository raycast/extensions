import fs from "fs";
import path from "path";
import { environment, getPreferenceValues } from "@raycast/api";
import { promisify } from "util";
import { execFile } from "child_process";
import { MutableRefObject } from "react";
import { findNodePath, findMmdcPath } from "./executables";
import { cleanupTempFile, createTempFile } from "./files";
import { Preferences } from "../types";

const execFilePromise = promisify(execFile);

/**
 * Clean Mermaid code by removing markdown fences if present
 */
export function cleanMermaidCode(mermaidCode: string): string {
  let cleanCode = mermaidCode;
  if (cleanCode.includes("```mermaid")) {
    cleanCode = cleanCode.replace(/```mermaid\n/, "").replace(/```$/, "");
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
  try {
    console.log(`Executing: ${nodePath} ${mmdcPath} with input ${inputFile} and output ${outputPath}`);

    // Prepare arguments for mmdc
    const args = [mmdcPath, "-i", inputFile, "-o", outputPath, "-t", theme, "-b", "transparent", "--scale", "2"];

    // Set environment with extended PATH to help find dependencies
    const env = {
      ...process.env,
      NODE_OPTIONS: "--max-old-space-size=4096",
      PATH: `${path.dirname(nodePath)}:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
    };

    // Execute Node.js with mmdc as an argument
    await execFilePromise(nodePath, args, { env, timeout });

    if (!fs.existsSync(outputPath)) {
      cleanupTempFile(inputFile);
      tempFileRef.current = null;
      throw new Error(`Diagram generation failed: Output file not found ${outputPath}`);
    }

    // Clean up temporary .mmd file
    cleanupTempFile(inputFile);
    tempFileRef.current = null;

    return outputPath;
  } catch (error: unknown) {
    console.error("Command execution failed:", error);

    // Clean up temporary files
    cleanupTempFile(inputFile);
    tempFileRef.current = null;

    // Provide more specific error messages
    if (error instanceof Error && error.message.includes("ETIMEDOUT")) {
      throw new Error(
        `Diagram generation timed out after ${timeout / 1000} seconds. Try increasing the timeout in preferences.`,
      );
    }

    throw new Error(`Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate Mermaid diagram using explicit Node.js path and execFile
 */
export async function generateMermaidDiagram(
  mermaidCode: string,
  tempFileRef: MutableRefObject<string | null>,
): Promise<string> {
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
    throw new Error("Could not find Node.js installation. Please make sure Node.js is installed.");
  }

  // Find mmdc path
  const mmdcPath = await findMmdcPath(preferences);
  console.log("Using mmdc at:", mmdcPath);

  // Get timeout from preferences and convert to number in milliseconds
  const timeoutStr = preferences.generationTimeout || "10";
  const timeoutInMs = parseInt(timeoutStr, 10) * 1000;

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
}
