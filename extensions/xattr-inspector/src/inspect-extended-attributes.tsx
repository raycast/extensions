import { getSelectedFinderItems, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "path";
import { FileWithXattrs, XAttr } from "./models/XAttrEntry";
import { runCommand } from "./utils/command";
import {
  detectAttributeKind,
  formatAttributeValue,
  isBinaryPlist,
  parseMACLRecords,
  readAttributeBuffer,
} from "./utils/xattrHelper";
import UnifiedAttributesList from "./views/UnifiedAttributesList";

async function readAttributes(filePath: string): Promise<XAttr[]> {
  const attributes: XAttr[] = [];

  const xattrOutput = await runCommand("xattr", [filePath]);
  if (typeof xattrOutput !== "string") {
    throw new Error("Unable to read attributes");
  }

  const xattrList = xattrOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const xattrName of xattrList) {
    try {
      const rawBuffer = await readAttributeBuffer(filePath, xattrName);
      const rawValue = rawBuffer.toString("utf8");
      const formattedValue = await formatAttributeValue(xattrName, rawValue, filePath, rawBuffer);
      const kindInfo = await detectAttributeKind(xattrName, rawValue, filePath, rawBuffer);

      attributes.push({
        name: xattrName,
        value: formattedValue,
        rawValue,
        rawHex: rawBuffer.toString("hex"),
        sizeBytes: rawBuffer.length,
        maclRecords: xattrName === "com.apple.macl" ? parseMACLRecords(rawBuffer) : undefined,
        isBinaryPlist: isBinaryPlist(rawBuffer),
        binaryPlistXml: kindInfo.binaryXml,
        plistJson: kindInfo.plistJson,
        plistSummary: kindInfo.plistSummary,
        kind: kindInfo.kind,
        editValue: kindInfo.editValue,
        filePath,
      });
    } catch (error) {
      attributes.push({
        name: xattrName,
        value: "Unable to read value",
        rawValue: `Error: ${String(error)}`,
        sizeBytes: 0,
        filePath,
      });
    }
  }

  return attributes;
}

export default function Command() {
  const [files, setFiles] = useState<FileWithXattrs[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchSelectedFiles() {
    setIsLoading(true);

    try {
      const selectedItems = await getSelectedFinderItems();

      if (selectedItems.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No file(s) selected",
          message: "Please select one or more files in Finder",
        });
        setIsLoading(false);
        return;
      }

      const filesData: FileWithXattrs[] = [];

      for (const { path: filePath } of selectedItems) {
        try {
          const attributes = await readAttributes(filePath);

          filesData.push({
            path: filePath,
            displayName: path.basename(filePath),
            attributes,
          });
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);

          filesData.push({
            path: filePath,
            displayName: path.basename(filePath),
            attributes: [
              {
                name: "ERROR",
                value: `Failed to read attributes: ${String(error)}`,
                rawValue: `Error: ${String(error)}`,
                sizeBytes: 0,
                filePath,
              },
            ],
          });
        }
      }

      setFiles(filesData);
    } catch (err) {
      const errorName = err instanceof Error ? err.name : "";
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCause = err instanceof Error ? err.cause : "";

      if (!errorMessage.includes("frontmost application")) {
        console.error(`Error fetching selected files: ${errorName} - ${errorMessage} - ${errorCause}`);
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get file attributes",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSelectedFiles();
  }, []);

  return <UnifiedAttributesList files={files} isLoading={isLoading} onRefresh={fetchSelectedFiles} />;
}
