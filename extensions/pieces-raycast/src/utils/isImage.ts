import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";

export default function isImage(classification?: ClassificationSpecificEnum) {
  const imageClassifications: Array<ClassificationSpecificEnum> = [
    ClassificationSpecificEnum.Jpg,
    ClassificationSpecificEnum.Jpeg,
    ClassificationSpecificEnum.Png,
  ];

  const isImage = imageClassifications.includes(
    classification ?? ClassificationSpecificEnum.Unknown,
  );

  return isImage;
}
