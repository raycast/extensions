declare module "jsforce" {
  export class Connection {
    constructor(options?: any);
    login(username: string, password: string): Promise<any>;
    search(query: string): Promise<any>;
    sobject(name: string): any;
    request: any;
  }
}
