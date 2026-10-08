import { join } from "path";
import { homedir } from "os";
import { appendFile, readFile, writeFile } from "fs/promises";
import { AbstractAdapter } from "./abstract.adapter";
import { Config } from "../../config";
import { Alias } from "../alias";

export class ZshAdapter extends AbstractAdapter {
  private readonly aliasRegex = /^alias\s+(\S+)="(.*)"$/;

  async isAliasFileLoaded(): Promise<boolean> {
    try {
      const fileContent = await readFile(this.defaultConfigFilePath, "utf8");
      return fileContent.includes(`source ~/${Config.aliasesFileName}`);
    } catch {
      return false;
    }
  }

  async configureConfigFile(): Promise<void> {
    await appendFile(this.defaultConfigFilePath, `\nsource ~/${Config.aliasesFileName}\n`);
  }

  async parseAliases(): Promise<Alias[]> {
    try {
      const fileContent = await readFile(this.aliasesFilePath, "utf8");
      const lines = fileContent.split("\n");
      return lines.reduce<Alias[]>((acc, line) => {
        const alias = this.aliasFromLine(line);
        if (alias) {
          acc.push(alias);
        }
        return acc;
      }, []);
    } catch {
      return [];
    }
  }

  async createAlias({ name, command }: Alias): Promise<void> {
    await appendFile(this.aliasesFilePath, `alias ${name}="${command}"\n`);
  }

  async updateAlias(name: string, values: Alias): Promise<void> {
    const fileContent = await readFile(this.aliasesFilePath, "utf8");
    const lines = fileContent.split("\n");
    const content = lines.map((line) => {
      const alias = this.aliasFromLine(line);
      if (!alias || alias.name !== name) {
        return line;
      }
      return `alias ${values.name}="${values.command}"`;
    });
    await writeFile(this.aliasesFilePath, content.join("\n"));
  }

  async deleteAlias(name: string): Promise<void> {
    const fileContent = await readFile(this.aliasesFilePath, "utf8");
    const lines = fileContent.split("\n");
    const newLines = lines.filter((line) => this.aliasFromLine(line)?.name !== name);
    await writeFile(this.aliasesFilePath, newLines.join("\n"));
  }

  get defaultConfigFilePath(): string {
    return join(homedir(), ".zshrc");
  }

  private aliasFromLine(line: string): Alias | null {
    const match = line.match(this.aliasRegex);
    if (!match) {
      return null;
    }
    const [, name, command] = match;
    return {
      name,
      command,
    };
  }
}
