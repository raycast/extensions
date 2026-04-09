import { ConfigService } from "./config-service";

const UNNECESSARY_SYMBOL = Symbol.for("unnecessary");

const UNNECESSARY_CONSTANT = "unnecessary";

export const configService = new ConfigService({
  [UNNECESSARY_SYMBOL]: UNNECESSARY_CONSTANT,
});

export function getUnnecessary(configService: ConfigService) {
  return configService.config[UNNECESSARY_SYMBOL];
}
