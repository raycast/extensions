/** Which color the eyedropper should pick. */
export type PickTarget = "foreground" | "background" | "both";

/** Data passed between the two commands with `launchCommand`. */
export type ContrastContext = {
  foreground?: string;
  background?: string;
  /** Set when "Check Contrast" asks "Pick & Check Contrast" to pick again. */
  pick?: PickTarget;
};
