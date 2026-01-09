export interface FileInfo {
  name: string;
  commandline: string;
  size?: number;
  dateCreated?: Date;
  dateModified?: Date;
  isDirectory?: boolean;
}

export interface Preferences {
  esExePath?: string;
  fileExplorerCommand?: string;
  defaultSort: string;
  openFolderAsDefault?: boolean;
  minCharsToSearch?: string;
}
