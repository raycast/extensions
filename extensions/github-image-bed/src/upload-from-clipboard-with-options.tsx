// @ts-nocheck - Raycast internal React types conflict with @types/react v18
import {
  List,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { RequestError } from "@octokit/request-error";
import {
  UploadResult,
  uploadImageBuffer,
  getImageFromClipboard,
} from "./utils";
import ResultList from "./components/ResultList";

/**
 * Main command: Upload clipboard image and choose output format
 */
export default function Command(
  props: LaunchProps<{ arguments: Arguments.UploadFromClipboardWithOptions }>,
) {
  const preferences =
    getPreferenceValues<Preferences.UploadFromClipboardWithOptions>();
  const { imageName } = props.arguments;
  const [result, setResult] = useState<UploadResult>({
    status: "loading",
    url: "",
    errorMessage: "",
  });
  const hasUploaded = useRef(false);

  useEffect(() => {
    if (hasUploaded.current) return;
    hasUploaded.current = true;

    (async () => {
      try {
        const image = await getImageFromClipboard();

        if (!image) {
          throw new Error("No image found in clipboard");
        }

        const url = await uploadImageBuffer(
          image.buffer,
          image.ext,
          preferences,
          imageName || "",
        );

        setResult({
          status: "success",
          url,
          errorMessage: "",
        });

        showToast({
          style: Toast.Style.Success,
          title: "Image uploaded successfully!",
        });
      } catch (error) {
        let errorMessage = "Unknown error occurred";
        if (error instanceof RequestError) {
          errorMessage = `GitHub API Error: ${error.message}`;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setResult({
          status: "error",
          url: "",
          errorMessage,
        });
        showToast({
          style: Toast.Style.Failure,
          title: "Upload failed",
          message: errorMessage,
        });
      }
    })();
  }, []);

  if (result.status === "loading") {
    return <List isLoading={true} />;
  }

  if (result.status === "error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Upload Failed"
          description={result.errorMessage}
        />
      </List>
    );
  }

  return <ResultList url={result.url} />;
}
