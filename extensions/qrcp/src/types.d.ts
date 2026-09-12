export type QrcpServer = {
  url: string;
  close: () => Promise<void>;
  onFileReceived?: (cb: (fileName: string) => void) => void;
  onDeviceConnected?: (cb: (ip: string) => void) => void;
  onDownload?: (cb: () => void) => void;
};
