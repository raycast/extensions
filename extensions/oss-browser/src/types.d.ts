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
  stickBookmark: boolean;
  copyUrlAfterUpload: boolean;
  renameFileAs: RenameType;
}

interface IObject {
  name: string;
  url: string;
  lastModified: string;
  type: string;
  size: number;
}

interface IBucket {
  name: string;
  region: string;
}

interface IObjectURLAndACL {
  url: string;
  acl: string;
  bucketAcl?: string;
}

interface IMark {
  key: string;
  ctime: Date;
}
