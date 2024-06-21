export type ApplicationInfo = {
  name: string;
  bundleId: string;
};

export interface ScratchPadCreationFormValues {
  fileType?: string;
  folders?: string[];
  fileNamePrefix?: string;
  applicationBundleId?: string;
}
