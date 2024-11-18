export interface Configuration {
  quarkusVersion: string;
  group: string;
  artifact: string;
  buildTool: string;
  javaVersion: string;
  starterCode: boolean;
  dependencies: string[];
}
