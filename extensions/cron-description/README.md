# Cron Description

_Converts cron expressions into a human readable description._

Additionally, set the cron timezone to see when the next run will be.

**Default Timezone Preference:**

- **Preference name:** `defaultTimezone`
- **Format:** an IANA timezone string (for example, `UTC`, `America/New_York`, `Europe/London`).
- **Behavior:** If set to a valid timezone the extension will use it as the default for cron calculations. Leave empty to use your local timezone. Invalid values fall back to the local timezone and show a warning.
