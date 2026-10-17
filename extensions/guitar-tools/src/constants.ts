export const SAMPLE_RATE = 44100;

// Standard chromatic scale note names (12-tone equal temperament)
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// A4 frequency standard (440Hz) - international pitch standard
export const A4_FREQ = 440;

// Minimum clarity threshold for valid pitch detection (0 to 1 scale)
export const CLARITY_THRESHOLD = 0.8;

// Cents threshold for switching to adjacent note
export const CENTS_THRESHOLD = 50;

// Number of cents to display on either side of the note indicator
export const DISPLAY_CENTS = 25;

// Thresholds for displaying tuning status
const inTuneThreshold = Math.round(CENTS_THRESHOLD / 15);
const closeThreshold = Math.round(CENTS_THRESHOLD / 2);
const farThreshold = CENTS_THRESHOLD;
export const DISPLAY_THRESHOLDS = {
  inTune: inTuneThreshold,
  close: closeThreshold,
  far: farThreshold,
};
