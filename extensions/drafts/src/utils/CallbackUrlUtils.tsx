import open from "open";

// export type CallbackParam = {
//     [key: string]: string;
// }

export interface CallbackParam {
  name: string;
  value: string;
}

// export interface CallbackUrl {
//     baseUrl: string;
//     callbackParams: Map<string, string>;
// }

export class CallbackUrl {
  private callbackParams: CallbackParam[] = [];
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getParams(): CallbackParam[] {
    return this.callbackParams;
  }

  addParam(callbackParam: CallbackParam) {
    this.callbackParams.push(callbackParam);
  }

  createCallbackUrl(): string {
    let paramCount = 0;
    let url = this.baseUrl;
    this.callbackParams.forEach(function (param) {
      url = url + (paramCount == 0 ? "" : "&") + param.name + "=" + encodeURIComponent(param.value);
      paramCount = paramCount + 1;
    });
    return url;
  }

  async openCallbackUrl() {
    await open(this.createCallbackUrl());
    return;
  }
}
