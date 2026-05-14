export const PICTURE_MODES = {
  DOLBY_VISION: {
    id: "dolbyVision",
    apiValue: "dvDark",
    label: "Dolby Vision Dark",
    sharpness: "20",
  },
  STANDARD: {
    id: "standard",
    apiValue: "imax",
    label: "IMAX Enhanced",
    sharpness: "20",
  },
} as const;

export const TARGETS = {
  PICTURE_MODE: "pictureMode",
  SHARPNESS: "sharpness",
} as const;
