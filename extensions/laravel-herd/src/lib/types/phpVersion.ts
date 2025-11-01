export interface PHPVersion {
  cycle: string;
  key: string;
  latest: string;
  status: "active" | "inactive" | "error";
  installed: boolean;
  updateAvailable: boolean;
}
