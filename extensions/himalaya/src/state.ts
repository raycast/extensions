import { Envelope, Folder } from "./models";

export interface State {
  isLoading: boolean;
  envelopes: Envelope[];
  folders: Folder[];
  currentFolderName: string;
  exe: boolean;
}
