import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  showInFinder,
  captureException,
  getPreferenceValues,
  openExtensionPreferences,
  confirmAlert,
  LaunchProps,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import fs from "fs";
import { pipeline as streamPipeline } from "node:stream/promises";
import { got, RequestError } from "got";
import isImage from "is-image";
import { FormData as FormDataNode } from "formdata-node";
import { fileFromPath } from "formdata-node/file-from-path";
import { homedir } from "os";
import { join } from "path";

type Values = {
  imagePaths: string[];
  removeBackground: boolean;
  backgroundColor: string;
  backgroundPrompt: string;
  shadowMode: string;
  scalingMode: string;
  snappedToCroppedEdges: boolean;
  outputSize: string;
  widthxHeight: string;
  maxWidth: string;
  maxHeight: string;
};

interface Preferences {
  photoroomApiKey: string;
}

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props;

  const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$|^#(?:[0-9a-fA-F]{4}){1,2}$/;
  const widthxHeightRegex = /^(\d+)x(\d+)$/;

  const [loading, isLoading] = useState(false);

  const { handleSubmit, itemProps, setValue, values, setValidationError } = useForm<Values>({
    async onSubmit(values) {
      console.log(values);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Editing images...",
      });

      const imagePaths = values.imagePaths.flatMap((path: string) => {
        if (fs.statSync(path).isDirectory()) {
          return flattenDirectory(path);
        } else if (fs.existsSync(path) && fs.lstatSync(path).isFile() && isImage(path)) {
          return [path];
        } else {
          return [];
        }
      });

      function flattenDirectory(directoryPath: string): string[] {
        const dirents = fs.readdirSync(directoryPath, { withFileTypes: true });
        const imageFilePaths = dirents
          .filter((dirent) => dirent.isFile())
          .map((dirent) => join(directoryPath, dirent.name))
          .filter((filePath) => isImage(filePath));

        const nestedDirectoryPaths = dirents
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => join(directoryPath, dirent.name));

        const flattenedNestedDirectoryPaths = nestedDirectoryPaths.flatMap(flattenDirectory);

        return [...imageFilePaths, ...flattenedNestedDirectoryPaths];
      }

      console.log(imagePaths);

      if (imagePaths.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = "Select at least one valid image file";
        return false;
      }

      isLoading(true);

      const desktopPath = join(homedir(), "Desktop");

      const url = "https://image-api.photoroom.com/v2/edit";
      const photoroomApiKey = getPreferenceValues<Preferences>().photoroomApiKey;

      const promises = imagePaths.map(async (path) => {
        const file = await fileFromPath(path);

        const backgroundColorWithoutHash = values.backgroundColor.replace("#", "");

        const form = new FormDataNode();
        form.set("background.color", backgroundColorWithoutHash);
        form.set("removeBackground", values.removeBackground ? "true" : "false");
        form.set("imageFile", file);
        form.set("outputSize", values.outputSize === "custom" ? values.widthxHeight : values.outputSize);
        form.set("background.prompt", values.backgroundPrompt);
        if (values.shadowMode !== "none") {
          form.set("shadow.mode", values.shadowMode);
        }
        form.set("scaling", values.scalingMode);
        form.set("ignorePaddingAndSnapOnCroppedSides", values.snappedToCroppedEdges ? "true" : "false");
        if (values.outputSize === "originalImage" || values.outputSize === "cutout") {
          if (values.maxWidth) {
            form.set("maxWidth", values.maxWidth);
          }
          if (values.maxHeight) {
            form.set("maxHeight", values.maxHeight);
          }
        }

        const options = {
          headers: {
            Accept: "image/png, application/json",
            "x-api-key": photoroomApiKey,
          },
          body: form,
        };

        const gotStream = got.stream.post(url, options);

        const date = new Date();
        const timestamp = `${date.toLocaleDateString("en-US").replace(/\//g, "-")}_${date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/:/g, "-").replace(/\//g, "-")}`;
        const fileName = file.name.split(".").slice(0, -1).join(".");
        const desktopPath = homedir + "/Desktop";
        const outPath = join(desktopPath, fileName + "_" + timestamp + ".png");
        const outStream = fs.createWriteStream(outPath);

        try {
          await streamPipeline(gotStream, outStream);
          return true;
        } catch (error) {
          let statusCode, body;
          if (error instanceof RequestError) {
            const requestError = error as RequestError;
            statusCode = requestError.response?.statusCode;
            body = requestError.response?.body;
            console.error(statusCode);
            console.error(body);
          }
          console.error(error);
          captureException(error);
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to edit image";
          toast.message = error instanceof Error ? error.message : "See logs for details";

          confirmAlert({
            title: "Failed to edit image at path " + path,
            message: statusCode + "\n" + body + "\n" + (error instanceof Error ? error.message : ""),
          });
          return false;
        }
      });

      const results = await Promise.all(promises);

      isLoading(false);
      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = "Saved to Desktop";

      await showInFinder(desktopPath);
      return results.find((result) => !result) == undefined;
    },
    validation: {
      imagePaths: (files) => {
        const nonImageFiles = files?.filter((file) => file && !isImage(file) && !fs.statSync(file).isDirectory());

        if (nonImageFiles && nonImageFiles.length > 0) {
          return `${nonImageFiles.length} file(s) selected are not image files`;
        } else if (files === undefined || files.length === 0) {
          return "Select at least one image";
        }
      },
      removeBackground: (removeBackground) => {
        if (removeBackground == false) {
          setValue("snappedToCroppedEdges", false);
        }
        return undefined;
      },
      backgroundColor: (color) => {
        if (color && !hexColorRegex.test(color)) {
          return "Enter a valid color hex";
        } else {
          if (color && color.length > 0) {
            setValue("removeBackground", true);
            setValue("backgroundPrompt", "");
          }
          return undefined;
        }
      },
      backgroundPrompt: (prompt) => {
        if (prompt && prompt.length > 0) {
          setValue("removeBackground", true);
          setValue("backgroundColor", "");
        }
        return undefined;
      },
      shadowMode: FormValidation.Required,
      scalingMode: FormValidation.Required,
      snappedToCroppedEdges: (snappedToCroppedEdges) => {
        if (snappedToCroppedEdges) {
          setValue("removeBackground", true);
        }
        return undefined;
      },
      outputSize: (outputSize) => {
        if (outputSize === "custom") {
          if (
            !values.widthxHeight ||
            values.widthxHeight.length === 0 ||
            !widthxHeightRegex.test(values.widthxHeight)
          ) {
            setValidationError("widthxHeight", "Enter a (valid) width and height");
          }
        } else {
          setValue("widthxHeight", "");
        }
        return undefined;
      },
      widthxHeight: (widthxHeight) => {
        if (
          values.outputSize === "custom" &&
          (!widthxHeight || widthxHeight === "" || !widthxHeightRegex.test(widthxHeight))
        ) {
          return "Enter a (valid) width and height";
        }
        return undefined;
      },
      maxHeight: (maxHeight) => {
        if (
          (values.outputSize === "croppedSubject" || values.outputSize === "originalImage") &&
          maxHeight &&
          maxHeight.length > 0 &&
          isNaN(parseInt(maxHeight))
        ) {
          return "Enter a (valid) max height";
        }
        return undefined;
      },
      maxWidth: (maxWidth) => {
        if (
          (values.outputSize === "croppedSubject" || values.outputSize === "originalImage") &&
          maxWidth &&
          maxWidth.length > 0 &&
          isNaN(parseInt(maxWidth))
        ) {
          return "Enter a (valid) max width";
        }
        return undefined;
      },
    },
    initialValues: draftValues
      ? draftValues
      : {
          imagePaths: [],
          removeBackground: true,
          backgroundColor: "",
          backgroundPrompt: "",
          shadowMode: "none",
          scalingMode: "fit",
          snappedToCroppedEdges: false,
          widthxHeight: "1000x1000",
          outputSize: "custom",
          maxWidth: undefined,
          maxHeight: undefined,
        },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      searchBarAccessory={
        <Form.LinkAccessory target="https://app.photoroom.com/playground-website" text="Open API Playground" />
      }
      isLoading={loading}
      navigationTitle="Edit images with Photoroom"
      enableDrafts
    >
      <Form.FilePicker
        allowMultipleSelection
        title="Images"
        info="Image files or directories with image files in it. Non-image files are skipped."
        canChooseDirectories
        {...itemProps.imagePaths}
      />

      <Form.Separator />

      <Form.Description text="Background" />
      <Form.Checkbox label="Remove background" storeValue {...itemProps.removeBackground} />
      <Form.TextField
        title="Background color"
        placeholder="6 digit color hex"
        info="E.g., #000000 (fully transparent) or #ffffff (white)"
        {...itemProps.backgroundColor}
      />
      <Form.Description text="OR" />
      <Form.TextArea
        title="Background prompt"
        placeholder="Enter a prompt"
        info="Prompt to use for guiding the background generation process."
        {...itemProps.backgroundPrompt}
      />

      <Form.Separator />

      <Form.Description text="AI Shadow" />
      <Form.Dropdown
        title="Add shadow"
        storeValue
        info="Shadow generation mode to use on the subject."
        {...itemProps.shadowMode}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="ai.soft" title="Soft" />
        <Form.Dropdown.Item value="ai.hard" title="Hard" />
        <Form.Dropdown.Item value="ai.floating" title="Floating" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Position" />
      <Form.Dropdown
        title="Scaling Mode"
        info="Whether the subject should fit (default) or fill the output image. If set to fit, the empty pixels will be transparent."
        {...itemProps.scalingMode}
      >
        <Form.Dropdown.Item value="fit" title="Fit" />
        <Form.Dropdown.Item value="fill" title="Fill" />
      </Form.Dropdown>
      <Form.Checkbox
        label="Snapped to cropped edges"
        info="If enabled (default), cropped sides of the subject will snap to the edges. For instance, for a portrait image cropped below the elbows, the subject will be aligned at the bottom even if a bottom padding is provided (but it will still respect bottom margin). Can't be set if background removal is disabled."
        {...itemProps.snappedToCroppedEdges}
      />

      <Form.Separator />

      <Form.Description text="Size" />
      <Form.Dropdown
        title="Output Size"
        info="The size of the output image. If set to original image, the original size of the image will be used."
        {...itemProps.outputSize}
      >
        <Form.Dropdown.Item value="custom" title="Custom" />
        <Form.Dropdown.Item value="originalImage" title="Original Image" />
        <Form.Dropdown.Item value="croppedSubject" title="Cutout" />
      </Form.Dropdown>

      <Form.TextField
        title="Width x Height"
        placeholder="1000x1000"
        info="The width and height of the output image in pixels. Ignored if output size is not custom."
        {...itemProps.widthxHeight}
      />

      <Form.TextField
        title="Max Height"
        placeholder="1000"
        info="The maximum height of the output image in pixels. Ignored if output size is not original image or cutout. Useful for resizing an image while keeping the aspect ratio."
        {...itemProps.maxHeight}
      />

      <Form.TextField
        title="Max Width"
        placeholder="1000"
        info="The maximum width of the output image in pixels. Ignored if output size is not original image or cutout. Useful for resizing an image while keeping the aspect ratio."
        {...itemProps.maxWidth}
      />
    </Form>
  );
}
