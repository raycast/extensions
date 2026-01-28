export interface LastBuildStatus {
  application: {
    _id: string;
    appName: string;
  };
  build: {
    _id: string;
    status: string;
  };
}
