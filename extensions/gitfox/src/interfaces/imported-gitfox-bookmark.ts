export default interface GitfoxRepositories {
  children: GitfoxRepository[];
}

export interface GitfoxRepository {
  title: string;
  uniqueIdentifier: string;
  url?: {
    relative: string;
  };
  children: GitfoxRepository[];
}
