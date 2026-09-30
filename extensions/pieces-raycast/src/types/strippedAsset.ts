import {
  ClassificationSpecificEnum,
  SeededAnnotation,
  SeededTag,
  SeededWebsite,
} from "@pieces.app/pieces-os-client";

export type StrippedAsset = {
  id: string;
  text: string;
  ext?: ClassificationSpecificEnum;
  tags?: SeededTag[];
  websites?: SeededWebsite[];
  name?: string;
  annotations?: SeededAnnotation[];
};
