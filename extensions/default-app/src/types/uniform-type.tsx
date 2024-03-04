import { Application } from "@raycast/api";

export type UniformType = {
  application: Application;
  id: string;
  description?: string;
  preferredMimeType?: string;
  preferredFilenameExtension?: string;
};
