export const ALL_WAVE_MODELS = [
  "GDWPS 25 km",
  "GWAM 27 km",
  "EWAM 5 km",
  "GFS-Wave 9 km",
  "GFS-Wave 16 km",
  "GFS-Wave 25 km",
];

export const WAVE_PROPERTIES = [
  "htsgw",
  "wadirn",
  "perpw",
  "swell1",
  "swdirn1",
  "swper1",
  // "swell2",
  // "swdirn2",
  // "swper2",
  // "wvhgt",
  // "wvdirn",
  // "wvper",
];

export const WAVE_PROPERTY_TRANSLATIONS: Record<string, string> = {
  htsgw: "Wave height",
  wadirn: "Wave direction",
  perpw: "Peak wave period (seconds)",
  swell1: "Height of primary swell waves",
  swdirn1: "Swell direction",
  swper1: "Swell period",
  // swell2: "Significant height of secondary swell waves",
  // swdirn2: "Secondary swell direction",
  // swper2: "Secondary swell period (seconds)",
  // wvhgt: "Significant height of wind waves",
  // wvdirn: "Direction of wind waves",
  // wvper: "Period of wind waves (seconds)",
};
