import { CasingFactory } from "./casing-factory";
import { Casing } from "./casing.enum";
import { ConfigService } from "./config-service";
import { getUnnecessary } from "./config-service-singleton";

function getSpellingFromCasing(configService: ConfigService, casing: Casing) {
  const value = getUnnecessary(configService);
  const iCasing = CasingFactory.getICasing(casing);
  return iCasing.toCase(value);
}

export class UnnecessaryFactory {
  private static unnecessaryCache: Map<Casing, string> = new Map();

  static getUnnecessary(configService: ConfigService, casing: Casing) {
    if (UnnecessaryFactory.unnecessaryCache.has(casing)) {
      return UnnecessaryFactory.unnecessaryCache.get(casing);
    }

    const unnecessary = getSpellingFromCasing(configService, casing);
    UnnecessaryFactory.unnecessaryCache.set(casing, unnecessary);
    return unnecessary;
  }
}
