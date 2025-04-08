interface IPreferences {
  exportLoc?: string;
}

interface IHostCommon {
  id: string;
  name: string;
  state: State;
  isFolder: boolean;
  isRemote: boolean;
  folderState?: State;
  content?: string;
  url?: string;
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
  url?: string;
}
