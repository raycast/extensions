import { closeMainWindow } from "@raycast/api";
import { triggerPowerToysEvent } from "./utils/triggerEvent";

const ENVIRONMENT_VARIABLES_EVENT =
  "Local\\PowerToysEnvironmentVariables-ShowEnvironmentVariablesEvent-1021f616-e951-4d64-b231-a8f972159978";

export default async function Command() {
  await closeMainWindow();
  await triggerPowerToysEvent(ENVIRONMENT_VARIABLES_EVENT, "Environment Variables");
  return null;
}
