// @ts-nocheck - Raycast internal React types conflict with @types/react v18
import {
  Form,
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";
import { useState, useRef } from "react";
import * as fs from "fs";
import { RequestError } from "@octokit/request-error";
import {
  Preferences,
  Arguments,
  UploadResult,
  uploadImageBuffer,
  detectImageType,
} from "./utils";
import ResultList from "./components/ResultList";

/**
 * Main command: Select image file and upload to GitHub
 * Uses Raycast native Form.FilePicker for file selection
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const { imageName } = props.arguments;
  const [phase, setPhase] = useState<"pick" | "result">("pick");
  const [result, setResult] = useState<UploadResult>({
    status: "loading",
    url: "",
    errorMessage: "",
  });
  const isUploading = useRef(false);

  async function handleSubmit(values: { imageFile: string[] }) {
    if (isUploading.current) return;
    isUploading.current = true;

    const selectedPaths = values.imageFile;
    if (!selectedPaths || selectedPaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
      });
      isUploading.current = false;
      return;
    }

    const filePath = selectedPaths[0];
    if (!fs.existsSync(filePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "File not found",
      });
      isUploading.current = false;
      return;
    }

    setPhase("result");
    setResult({
      status: "loading",
      url: "",
      errorMessage: "",
    });

    try {
      const buffer = fs.readFileSync(filePath);
      const imageType = await detectImageType(buffer);

      if (!imageType) {
        throw new Error("Selected file is not a valid image");
      }

      const url = await uploadImageBuffer(
        buffer,
        imageType.ext,
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
    } finally {
      isUploading.current = false;
    }
  }

  // Phase: Result display
  if (phase === "result") {
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

  // Phase: File picker
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="imageFile"
        title="Select Image"
        allowMultipleSelection={false}
      />
      <Form.Description text="Supported formats: PNG, JPG, GIF, WebP, BMP and other image files" />
    </Form>
  );
}
