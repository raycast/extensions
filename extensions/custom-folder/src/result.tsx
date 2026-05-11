import { Action, ActionPanel, Detail, popToRoot, showToast, Toast } from "@raycast/api";
import { FolderForm } from "./types";
import { customize } from "./utils/customize";
import { useEffect, useState } from "react";
import { base64ToFile } from "./utils/saveFile";
import path from "path";
import { ReplaceAction } from "./components/replaceAction";

export default function Result({ formValues, fromEmoji }: { formValues: FolderForm; fromEmoji?: boolean }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageResult, setImageResult] = useState<{
    baseImage: string | null;
    previewImage: string | null;
    name: string | null;
    width: number | null;
    height: number | null;
    outputPath: string | null;
  }>({
    baseImage: null,
    previewImage: null,
    width: null,
    height: null,
    outputPath: null,
    name: null,
  });
  const tmpDirectory = path.resolve("/tmp");

  const markdown = `
  ![](${imageResult?.previewImage})
  `;

  const saveFile = async (output: string, variant: "saved" | "applied") => {
    if (!imageResult?.baseImage) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save image",
      });
      return;
    }
    base64ToFile(imageResult?.baseImage, output)?.then(async (res) => {
      if (res === "success") {
        await showToast({
          style: Toast.Style.Success,
          title: `Image ${variant} successfully`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save image",
        });
      }
    });
  };

  useEffect(() => {
    const fetchImage = async () => {
      setIsLoading(true);
      const result = await customize(formValues.file[0], formValues.padding as number, formValues.shades);
      let outputPath: string;

      // get file path without file name
      const filePathArray = formValues.file[0]?.split("/");
      const fileArray = filePathArray.pop()?.split(".");

      // take extension
      const extension = fileArray?.pop();
      // join rest to get filename
      const filename = fileArray?.join(".");

      const filePath = filePathArray.join("/");
      const fileName = `${filename}-folder.${extension}`;

      if (formValues?.output?.length == 0) {
        outputPath = `${filePath}/${fileName}`;
      } else {
        outputPath = `${formValues.output[0]}/${fileName}`;
      }
      setImageResult({
        baseImage: result?.base64BaseImage as string,
        previewImage: result?.base64PreviewImage as string,
        width: result?.baseWidth as number,
        height: result?.baseHeight as number,
        outputPath: outputPath,
        name: fileName as string,
      });

      setIsLoading(false);
    };

    fetchImage().catch((error) => console.error(error));
  }, [formValues]);

  return (
    <Detail
      actions={
        <ActionPanel>
          {formValues.targetFolderPath && formValues.targetFolderPath.length > 0 && (
            <ReplaceAction
              iconPath={`${tmpDirectory}/${imageResult?.name}`}
              targetFolderPath={formValues?.targetFolderPath?.[0]}
              onAction={() => saveFile(`${tmpDirectory}/${imageResult?.name}`, "applied")}
            />
          )}
          <Action
            title="Save Image"
            onAction={() => {
              saveFile(imageResult?.outputPath as string, "saved").then(() => popToRoot());
            }}
            icon={"download-16"}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`From ${fromEmoji ? "emoji" : formValues?.file[0]}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`${imageResult?.height} px`} />
          <Detail.Metadata.Label title="Weight" text={`${imageResult?.width} px`} />
          <Detail.Metadata.TagList title="Name">
            <Detail.Metadata.TagList.Item text={`${imageResult?.name}`} color={"#60d0ff"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {formValues?.targetFolderPath && formValues?.targetFolderPath.length > 0 && (
            <Detail.Metadata.Label title="Target path" text={`${formValues?.targetFolderPath}`} />
          )}
          <Detail.Metadata.Label title="Download path" text={`${imageResult?.outputPath}`} />
        </Detail.Metadata>
      }
    />
  );
}
