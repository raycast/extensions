import { showHUD, Clipboard } from "@raycast/api";
import { RandomCasingFactory } from "./random-casing-factory";
import { UnnecessaryFactory } from "./unnecessary-factory";
import { configService } from "./config-service-singleton";

export default async function main() {
  const randomCasing = RandomCasingFactory.getRandomCasing();

  const unnecessary = UnnecessaryFactory.getUnnecessary(configService, randomCasing);

  // TODO: figure out why this is maybe undefined?
  await Clipboard.copy(unnecessary!);
  await showHUD(`"${unnecessary}" copied to clipboard`);
}
