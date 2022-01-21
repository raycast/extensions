import { PackageVersion } from "./package-version.model";

export class Package {
  public name: string;
  public latest: PackageVersion;

  public constructor(name: string, latest: PackageVersion) {
    this.name = name;
    this.latest = latest;
  }
}
