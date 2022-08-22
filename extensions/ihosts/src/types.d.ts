interface IPreferences {
  exportLoc?: string;
}

interface IHostCommon {
  id: string;
  name: string;
  state: State;
  isFolder: boolean;
  folderState?: State;
  content?: string;
  mode?: HostFolderMode;
  hosts?: IHostCommon[];
  ctime: number;
}

interface INewFolder {
  name: string;
  mode: HostFolderMode;
}

interface IUpsertHost {
  id?: string;
  name: string;
  folder: string;
  content: string;
}
