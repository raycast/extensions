export interface PackageResponseModel {
  data: artifactMapModel[];
  errorCode: number;
  errorMsg: string;
}

export interface artifactMapModel {
  artifactMap: {
    [key: string]: artifactModel[];
  };
  groupName: string;
}

export interface artifactModel {
  artifact: string;
  content: string;
  date: number;
  group: string;
  id: number;
  version: string;
}
