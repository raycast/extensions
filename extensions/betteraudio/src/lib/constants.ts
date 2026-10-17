export const CLI_PATHS = [
  "/usr/local/bin/betteraudio",
  "/opt/homebrew/bin/betteraudio",
  "/Applications/BetterAudio.app/Contents/Helpers/betteraudio",
  `${process.env.HOME}/Applications/BetterAudio.app/Contents/Helpers/betteraudio`,
];

export const CLI_TIMEOUT = 10_000;

export const EQ_PRESETS = [
  { value: "flat", title: "Flat" },
  { value: "bassBoost", title: "Bass Boost" },
  { value: "bassCut", title: "Bass Cut" },
  { value: "trebleBoost", title: "Treble Boost" },
  { value: "vocalClarity", title: "Vocal Clarity" },
  { value: "podcast", title: "Podcast" },
  { value: "spokenWord", title: "Spoken Word" },
  { value: "loudness", title: "Loudness" },
  { value: "lateNight", title: "Late Night" },
  { value: "smallSpeakers", title: "Small Speakers" },
  { value: "rock", title: "Rock" },
  { value: "pop", title: "Pop" },
  { value: "electronic", title: "Electronic" },
  { value: "jazz", title: "Jazz" },
  { value: "classical", title: "Classical" },
  { value: "hipHop", title: "Hip-Hop" },
  { value: "randb", title: "R&B" },
  { value: "deep", title: "Deep" },
  { value: "acoustic", title: "Acoustic" },
  { value: "movie", title: "Movie" },
] as const;

export const TRANSPORT_LABELS: Record<string, string> = {
  "built-in": "Built-in",
  usb: "USB",
  bluetooth: "Bluetooth",
  "bluetooth-le": "Bluetooth LE",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  thunderbolt: "Thunderbolt",
  firewire: "FireWire",
  pci: "PCI",
  aggregate: "Aggregate",
  airplay: "AirPlay",
  avb: "AVB",
  virtual: "Virtual",
};

export function formatTransportType(type?: string | null): string | undefined {
  if (!type) return undefined;

  const normalized = type.trim().toLowerCase();
  if (!normalized) return undefined;

  return (
    TRANSPORT_LABELS[normalized] ??
    normalized
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export const VOLUME_STEPS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170,
  180, 190, 200,
];
