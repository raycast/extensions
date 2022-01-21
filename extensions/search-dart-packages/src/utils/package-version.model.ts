export class PackageVersion {
  public version: string;
  public description: string;
  public repositiory: string;
  public homepage?: string;
  public documentation?: string;
  public published: string;

  constructor(
    version: string,
    description: string,
    repositiory: string,
    homepage: string,
    documentation: string,
    published: string
  ) {
    this.version = version;
    this.description = description;
    this.repositiory = repositiory;
    this.homepage = homepage;
    this.documentation = documentation;
    this.published = published;
  }
}
