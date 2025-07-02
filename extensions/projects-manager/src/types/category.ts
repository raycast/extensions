export type CategoryType = "command" | "template";

export type Category = {
  name: string;
  folderName: string;
  imagePath: string;
  defaultAppPath: string;
  type: CategoryType;
  command?: string;
  templatePath?: string;
  autoCreateRepo?: boolean;
  setupCommand?: string;
};
