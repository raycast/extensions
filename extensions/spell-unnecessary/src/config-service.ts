export class ConfigService {
  constructor(private _config: Record<string, string>) {}

  set config(value: Record<symbol, string>) {
    this._config = value;
  }

  get config() {
    return this._config;
  }
}
