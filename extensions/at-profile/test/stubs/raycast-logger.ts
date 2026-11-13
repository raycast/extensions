// Silent stand-in for @chrismessina/raycast-logger, which requires the real @raycast/api
const noop = () => undefined;
const make = (): Record<string, unknown> => ({
  log: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  child: () => make(),
});
export const logger = make();
