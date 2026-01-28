export interface Maintainer {
  username: string;
  email: string;
}

export interface Dependency {
  approximateSize: number;
  name: string;
}

export interface Package {
  name: string;
  description: string;
  scope: string;
  version: string;
  date: string;
  links: {
    npm: string;
    homepage: string;
    repository: string;
    bugs: string;
  };
  publisher: {
    username: string;
    email: string;
  };
  maintainers: Maintainer[];
}

export interface SizeData {
  assets: [
    {
      gzip: number;
      name: string;
      size: number;
      type: string;
    }
  ];
  dependencyCount: number;
  dependencySizes: Dependency[];
  description: string;
  gzip: number;
  hasJSModule: string;
  hasJSNext: boolean;
  hasSideEffects: boolean;
  isModuleType: boolean;
  name: string;
  peerDependencies: string[];
  repository: string;
  scoped: boolean;
  size: number;
  version: string;
}

export type State<TData, TError = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: TData }
  | { status: "error"; error: TError };
