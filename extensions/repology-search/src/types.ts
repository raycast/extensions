export interface Package {
  repo: string;
  subrepo: string;
  srcname: string;
  binname: string;
  visiblename: string;
  version: string;
  origversion: string;
  status: string;
  summary: string;
  licenses: string[];
  categories: string[];
  maintainers: string[];
}
