import type { CalendarProvider, ProviderType } from "../types";
import { savvycalProvider } from "./savvycal";
import { calcomProvider } from "./calcom";

const providers: Record<ProviderType, CalendarProvider> = {
  savvycal: savvycalProvider,
  calcom: calcomProvider,
};

export function getProvider(type: ProviderType): CalendarProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unknown provider: ${type}`);
  }
  return provider;
}

export { savvycalProvider, calcomProvider };
