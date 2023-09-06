// Every API Model, will extend from this, in order to ensure consistency among all our API Requests

export interface GitpodDataModel {
  parse: (json: string) => GitpodDataModel;
  fetch?: (params: any) => Promise<GitpodDataModel>;
}
