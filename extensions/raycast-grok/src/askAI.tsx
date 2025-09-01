import { useCallback } from "react";
import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { useGrok } from "./hooks/useGrok";
import AskUI, { AslFormData } from "./ui/AskUI";
import DetailUI from "./ui/DetailUI";
import fs from "node:fs";
import { ACCEPT_IMAGE_TYPES } from "./constants/accept";

export interface AskAILaunchContext {
  arguments: {
    query: string;
  };
  launchContext: {
    files?: string[];
    context?: string;
    useSelected?: boolean;
    allowPaste?: boolean;
  };
}

export default function AskAI({ launchContext }: LaunchProps<AskAILaunchContext>) {
  const { prompt } = getPreferenceValues();
  const { textStream, isLoading, lastQuery, submit } = useGrok(prompt, launchContext);

  const onSubmit = useCallback(
    (values: AslFormData) => {
      console.log("onSubmit", values);

      // Process image files
      let imageFiles: Buffer[] = [];
      const files = values?.files || [];
      const screenshotFiles: string[] = [];

      if (files && files.length > 0) {
        imageFiles = files
          .filter((file: string) => {
            if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
              return false;
            }
            // Check if it's an image file
            const ext = file.toLowerCase().split(".").pop();
            return ACCEPT_IMAGE_TYPES.includes(ext || "");
          })
          .map((file: string) => {
            // Track screenshot files for cleanup
            if (file.includes("screenshot_")) {
              screenshotFiles.push(file);
            }
            return fs.readFileSync(file);
          });
      }

      // Submit to AI
      submit(values.query, imageFiles);

      // Clean up temporary screenshot files
      screenshotFiles.forEach(file => {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log("Cleaned up screenshot file:", file);
          }
        } catch (error) {
          console.error("Failed to clean up screenshot file:", file, error);
        }
      });
    },
    [submit]
  );

  return isLoading || textStream ? (
    <DetailUI
      isLoading={isLoading}
      allowPaste={launchContext?.allowPaste}
      textStream={textStream}
      lastQuery={lastQuery}
    />
  ) : (
    <AskUI onSubmit={onSubmit} buffer={launchContext?.files} />
  );
}
