import fetch from "node-fetch";
import { Package } from "./package.model";
import { PackageVersion } from "./package-version.model";

interface SearchResponse {
  packages: { package: string }[],
  next: string
}

interface PackageResponse {
  name: string;
  latest: {
    pubspec: {
      version: string
      description: string
      repository: string
      homepage: string
      documentation: string
      published: string
    }
  };
}

export class Repository {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async search(query: string): Promise<Package[]> {
    const response = await fetch(this.endpoint + `/search?q=${query}`);
    const json = await response.json() as SearchResponse;

    let packages = json["packages"].map((p) => p.package);
    packages = packages.slice(0, 10);
    return Promise.all(packages.map((p) => this.getPackage(p)));
  }

  async getPackage(name: string): Promise<Package> {
    const response = await fetch(this.endpoint + `/packages/${name}`);
    const json = await response.json() as PackageResponse;

    return new Package(json.name, new PackageVersion(
      json.latest.pubspec.version,
      json.latest.pubspec.description,
      json.latest.pubspec.repository,
      json.latest.pubspec.homepage,
      json.latest.pubspec.documentation,
      json.latest.pubspec.published
    ));
  }
}