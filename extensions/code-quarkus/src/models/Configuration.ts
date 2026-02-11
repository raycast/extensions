export interface Configuration {
  quarkusVersion: string;
  group: string;
  artifact: string;
  version: string;
  buildTool: string;
  javaVersion: string;
  starterCode: boolean;
  dependencies: string[];
}
