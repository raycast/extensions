export const WISE_FAVICON = "https://wise.com/public-resources/assets/icons/wise-personal/favicon.png";

export const enum ACTIVITY_STATUS {
  REQUIRES_ATTENTION = "REQUIRES_ATTENTION", // Requires an end user attention
  IN_PROGRESS = "IN_PROGRESS", // Indicate that this activity has yet to be completed. (Example: In progress Top Up)
  UPCOMING = "UPCOMING", // Indicate that this activity is scheduled to be happen in the future. By default these activities will only be shown 2 days before the date. (Example: A scheduled transfer)
  COMPLETED = "COMPLETED", // Indicate that this activity is at its end state. (Example: A completed Top Up)
  CANCELLED = "CANCELLED", // Indicate that this activity is cancelled. (Example: A Top Up is cancelled)
}
