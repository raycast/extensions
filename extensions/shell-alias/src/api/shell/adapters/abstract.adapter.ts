import { join } from "path";
import { homedir } from "os";
import { Alias } from "../alias";
import { Config } from "../../config";

export abstract class AbstractAdapter {
  public abstract isAliasFileLoaded(): Promise<boolean>;
  public abstract configureConfigFile(): Promise<void>;
  public abstract parseAliases(): Promise<Alias[]>;
  public abstract createAlias(alias: Alias): Promise<void>;
  public abstract updateAlias(name: string, values: Alias): Promise<void>;
  public abstract deleteAlias(name: string): Promise<void>;
  public abstract get defaultConfigFilePath(): string;

  protected get aliasesFilePath(): string {
    return join(homedir(), Config.aliasesFileName);
  }
}
