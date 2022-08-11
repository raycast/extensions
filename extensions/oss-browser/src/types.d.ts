interface IPreferences {
  endPoint?: string;
  useCustomDomain?: boolean;
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  pageSize: string;
  downloadLoc?: string;
  streamThreshold: number;
}

interface IObject {
  name: string;
  url: string;
  lastModified: string;
  type: string;
  size: number;
}

interface IMark {
  key: string;
  ctime: Date;
}
