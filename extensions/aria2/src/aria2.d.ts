declare module "aria2" {
  export default class Aria2 {
    constructor(options: Aria2Options);
    async open(): Promise<void>;
    async close(): Promise<void>;
    async listMethods(): Promise<string[]>;
    async call(method: string, params?: any, options?: any): Promise<any>;
  }

  export interface Aria2Options {
    secret?: string;
    path?: string;
    host: string;
    secure?: boolean;
    port: number;
    WebSocket: typeof ws;
    fetch: (url: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
  }

  // 如果 'aria2' 模块还导出其他类型或函数，请根据实际情况添加更多声明。
}
