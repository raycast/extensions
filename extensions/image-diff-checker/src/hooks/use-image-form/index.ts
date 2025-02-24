import { useForm } from "@raycast/utils";
import { useState } from "react";
import { compare } from "../../utils/pixelmatch";
import { fileValidation } from "./file-validation";
import { Jimp } from "jimp";

interface ImagesFormValues {
  actual: string[];
  expected: string[];
}

export const useImagesForm = () => {
  const [markdown, setMarkdown] = useState<string>("");

  const createMarkdown = async (
    diffImageSource: Promise<{
      diffBuffer: Buffer;
      width: number;
      height: number;
    }>,
  ) => {
    const { width, height, diffBuffer } = await diffImageSource;
    const diffJimpImage = await new Jimp({ data: diffBuffer, width, height });
    const base64Image = await diffJimpImage.getBase64("image/png");
    setMarkdown(`![](${base64Image})`);
  };

  const { handleSubmit, itemProps } = useForm<ImagesFormValues>({
    onSubmit(values) {
      const diffImageSource = compare(values.actual[0], values.expected[0]);
      createMarkdown(diffImageSource);
    },
    validation: {
      actual: fileValidation,
      expected: fileValidation,
    },
  });

  return { handleSubmit, fields: itemProps, markdown };
};
