import { useForm } from "@raycast/utils";
import { useState } from "react";
import { compare } from "../../utils/pixelmatch";
import { fileValidation } from "./file-validation";
import { Jimp } from "jimp";
import { showToast, Toast } from "@raycast/api";
import { thresholdValidation } from "./threshold-validation";

interface ImagesFormValues {
  actual: string[];
  expected: string[];
  threshold: string;
}

export const useImagesForm = () => {
  const [markdown, setMarkdown] = useState<string>("");

  const createMarkdown = async (diffImageSource: { diffBuffer: Buffer; width: number; height: number }) => {
    const { width, height, diffBuffer } = diffImageSource;
    const diffJimpImage = new Jimp({ data: diffBuffer, width, height });
    const base64Image = await diffJimpImage.getBase64("image/png");
    setMarkdown(`![](${base64Image})`);
  };

  const createDiffImage = async (values: { actual: string[]; expected: string[]; threshold: string }) => {
    const diffImageSource = await compare(values.actual[0], values.expected[0], values.threshold);
    createMarkdown(diffImageSource);
  };

  const { handleSubmit, itemProps } = useForm<ImagesFormValues>({
    onSubmit: async (values) => {
      try {
        await createDiffImage(values);
        await showToast({
          style: Toast.Style.Success,
          title: "Success🎉",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Oops! Something went wrong",
          message: error instanceof Error ? error.message : "An error occurred while creating the diff image.",
        });
      }
    },
    validation: {
      actual: fileValidation,
      expected: fileValidation,
      threshold: thresholdValidation,
    },
  });

  return { handleSubmit, fields: itemProps, markdown };
};
