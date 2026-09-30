export default interface GitfoxRepositories {
  children: GitfoxRepositoryV2[];
}

export interface GitfoxRepositoryV3 {
  id: string;
  title: string;
  kind: {
    folder?: string;
    repository?: {
      url: {
        relative: string;
      };
    };
  };
  children?: GitfoxRepositoryV3[];
}

export interface GitfoxRepositoryV4 {
  title: string;
  kind: {
    folder?: {
      id: string;
    };
    repository?: {
      id: string;
      url: {
        relative: string;
      };
    };
  };
  children?: GitfoxRepositoryV4[];
}

export interface GitfoxRepositoryV2 {
  title: string;
  uniqueIdentifier: string;
  url?: {
    relative: string;
  };
  children: GitfoxRepositoryV2[];
}
