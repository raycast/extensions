import {
  getProductionJumpseatConfiguration,
  type JumpseatConfiguration,
} from "./config-values";

export function getJumpseatConfiguration(): JumpseatConfiguration {
  return getProductionJumpseatConfiguration();
}
