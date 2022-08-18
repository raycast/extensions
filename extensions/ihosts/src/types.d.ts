interface IHostFolder {
  id: string;
  name: string;
  state: State;
  mode: HostFolderMode;
  hosts?: IHost[];
}

interface IHost {
  id: string;
  name: string;
  state: State;
  content: string;
}

interface IHostCommon {
  id: string;
  name: string;
  state: State;
  folderState: State;
  content?: string;
  isFolder: boolean;
  mode?: HostFolderMode;
}
