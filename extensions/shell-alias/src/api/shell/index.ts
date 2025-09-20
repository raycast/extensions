import { AbstractAdapter } from "./adapters/abstract.adapter";
import { Alias } from "./alias";
import { AliasConflictError } from "./errors/alias-conflict";

export class ShellApi {
  constructor(private readonly shellAdapter: AbstractAdapter) {}

  async configure() {
    const isSetup = await this.shellAdapter.isAliasFileLoaded();
    if (isSetup) {
      return;
    }

    await this.shellAdapter.configureConfigFile();
  }

  getAliases() {
    return this.shellAdapter.parseAliases();
  }

  async createAlias(alias: Alias) {
    const existingAliases = await this.getAliases();
    if (existingAliases.some((existingAlias) => existingAlias.name === alias.name)) {
      throw new AliasConflictError(alias.name);
    }

    return this.shellAdapter.createAlias(alias);
  }

  async updateAlias(name: string, values: Alias) {
    const existingAliases = await this.getAliases();
    if (existingAliases.some((existingAlias) => existingAlias.name !== name && existingAlias.name === values.name)) {
      throw new AliasConflictError(values.name);
    }

    return this.shellAdapter.updateAlias(name, values);
  }

  deleteAlias(name: string) {
    return this.shellAdapter.deleteAlias(name);
  }
}
