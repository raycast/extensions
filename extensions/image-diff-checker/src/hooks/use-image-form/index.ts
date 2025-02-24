import { useForm } from "@raycast/utils";
import { useState } from "react";
import { compare } from "../../utils/pixelmatch";
import { fileValidation } from "./file-validation";

interface ImagesFormValues {
  actual: string[];
  expected: string[];
}

export const useImagesForm = () => {
  const [diffImage, setDiffImage] = useState<
    Promise<{
      diffBuffer: Buffer;
      width: number;
      height: number;
    }>
  >();
  const { handleSubmit, itemProps } = useForm<ImagesFormValues>({
    onSubmit(values) {
      const diffImageSource = compare(values.actual[0], values.expected[0]);
      setDiffImage(diffImageSource);
    },
    validation: {
      actual: fileValidation,
      expected: fileValidation,
    },
  });

  return { handleSubmit, fields: itemProps, diffImage };
};
