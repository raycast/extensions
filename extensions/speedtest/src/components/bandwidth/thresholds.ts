import { ActivitySpeedQuality } from "./types";

// Unit is MBps
const voiceCallQuality: ActivitySpeedQuality = {
  SD: {
    download: 0.05,
    upload: 0.05,
  },
  HD: {
    download: 0.1,
    upload: 0.1,
  },
};

const videCallQuality: ActivitySpeedQuality = {
  "480": {
    download: 1,
    upload: 1,
  },
  "720": {
    download: 3,
    upload: 3,
  },
  "1080": {
    download: 5,
    upload: 5,
  },
  "4K": {
    download: 20,
    upload: 20,
  },
};

const streamingQuality: ActivitySpeedQuality = {
  "480": {
    download: 1.5,
    upload: 1.5,
  },
  "720": {
    download: 5,
    upload: 5,
  },
  "1080": {
    download: 10,
    upload: 10,
  },
  "4K": {
    download: 25,
    upload: 25,
  },
};

export const ActivitySpeedQualityBandwidth = {
  voiceCall: voiceCallQuality,
  videoCall: videCallQuality,
  stream: streamingQuality,
};
