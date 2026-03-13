/**
 * Run deferred operation
 */
export type Operation = {
  run: () => Promise<void>;
};
