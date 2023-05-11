import { Envelope, Folder } from "./models";

export interface State {
  isLoading: boolean;
  envelopes: Envelope[];
  folders: Folder[];
  exe: boolean;
  currentFolderName: string;
  currentAccountName: string;
}
