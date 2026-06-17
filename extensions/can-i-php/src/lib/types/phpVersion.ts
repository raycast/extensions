import { PhpVersionStatusEnum } from "./phpVersionStatusEnum";

export interface PhpVersion {
  cycle: string;
  releaseDate: string;
  releaseDateHuman?: string | null;
  eol: string;
  eolHuman?: string | null;
  latest: string;
  latestReleaseDate: string;
  latestReleaseDateHuman?: string | null;
  lts: boolean;
  support: string;
  supportHuman?: string | null;
  status?: PhpVersionStatusEnum | null;
}
