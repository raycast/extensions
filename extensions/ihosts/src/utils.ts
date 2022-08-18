import { State } from "./const";

export function convertFolders2Common(folders: IHostFolder[]): IHostCommon[] {
  const list: IHostCommon[] = [];
  folders.forEach((folder) => {
    list.push(convertFolder2Common(folder));
    list.push(...(folder.hosts?.map((host) => convertHost2Common(host, folder.state)) || []));
  });
  return list;
}

function convertFolder2Common(folder: IHostFolder): IHostCommon {
  return {
    ...folder,
    folderState: folder.state,
    isFolder: true,
  };
}

function convertHost2Common(host: IHost, folderState: State): IHostCommon {
  return {
    ...host,
    folderState: folderState,
    isFolder: false,
  };
}
