export default class DocumentationItem {
  name: string;
  type: string;
  package: string;
  url: string;
  version: string;

  constructor(nameParam: string, typeParam: string, packageParam: string, urlParam: string, versionParam: string) {
    this.name = nameParam;
    this.type = typeParam;
    this.package = packageParam;
    this.url = urlParam;
    this.version = versionParam;

    return this;
  }
}
