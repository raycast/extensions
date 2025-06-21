const usDexcomAuthenticateURL =
  "https://share2.dexcom.com/ShareWebServices/Services/General/AuthenticatePublisherAccount";
const usDexcomLoginURL =
  "https://share2.dexcom.com/ShareWebServices/Services/General/LoginPublisherAccountById";
const usDexcomDataURL =
  "https://share2.dexcom.com/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues";
const dexcomApplicationId = "d8665ade-9673-4e27-9ff6-92db4ce13d13";

// outside of US
const dexcomAuthenticateURL =
  "https://shareous1.dexcom.com/ShareWebServices/Services/General/AuthenticatePublisherAccount";
const dexcomLoginURL =
  "https://shareous1.dexcom.com/ShareWebServices/Services/General/LoginPublisherAccountById";
const dexcomDataURL =
  "https://shareous1.dexcom.com/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues";

const TREND_VALUE_MAPPING = {
  None: "",
  DoubleUp: "⬆️⬆️",
  SingleUp: "⬆️",
  FortyFiveUp: "↗️",
  Flat: "➡️",
  FortyFiveDown: "↘️",
  SingleDown: "⬇️",
  DoubleDown: "⬇️⬇️",
  NotComputable: "🤷‍♂️",
  RateOutOfRange: "💣",
};

export {
  usDexcomAuthenticateURL,
  usDexcomLoginURL,
  dexcomAuthenticateURL,
  dexcomLoginURL,
  usDexcomDataURL,
  dexcomApplicationId,
  dexcomDataURL,
  TREND_VALUE_MAPPING,
};
