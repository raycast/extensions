const VAULT_TIMEOUT_OPTIONS = {
  IMMEDIATELY: "0",
  ONE_MINUTE: "60000",
  FIVE_MINUTES: "300000",
  FIFTEEN_MINUTES: "900000",
  THIRTY_MINUTES: "1800000",
  ONE_HOUR: "3600000",
  FOUR_HOURS: "14400000",
  EIGHT_HOURS: "28800000",
  ONE_DAY: "86400000",
  NEVER: "-1",
  SYSTEM_LOCK: "-2",
  SYSTEM_SLEEP: "-3",
} as const satisfies Record<string, Preferences["repromptIgnoreDuration"]>;

export const VAULT_TIMEOUT = Object.entries(VAULT_TIMEOUT_OPTIONS).reduce((acc, [key, value]) => {
  acc[key as keyof typeof VAULT_TIMEOUT_OPTIONS] = parseInt(value);
  return acc;
}, {} as Record<keyof typeof VAULT_TIMEOUT_OPTIONS, number>);
