/**
 * Whether a script directory is a work one: any `work` segment in the path counts, so
 * `~/dotfiles/profiles/work/scripts` is work and `~/scripts` is not. The match is
 * on whole segments, so `~/workscripts` stays personal, and it is case-sensitive — a `Work`
 * folder is a display name, not the convention this looks for.
 */
export const isWorkPath = (path: string) => path.split("/").includes("work");

/**
 * Where the Environment control's current value came from. An automatically chosen scope must never
 * override one the person typed, so the form remembers which it is: `auto` follows the directory,
 * `user` stops following it, and `null` is no value yet.
 */
export type EnvironmentSource = "auto" | "user" | null;

/** A fresh form ticks Environment on its own for a work directory, and starts empty otherwise. */
export const initialEnvironmentSource = (directory: string): EnvironmentSource =>
  isWorkPath(directory) ? "auto" : null;

/**
 * Whether a sigil hoisted out of Package may take the Environment control. An empty control never
 * blocks, and neither does an automatically chosen scope — it was the directory's guess, not the
 * person's choice. Anything the person set by hand, hoisted or picked, keeps the control.
 */
export const hoistShouldOverride = (chosenEnvironment: string, source: EnvironmentSource) =>
  !chosenEnvironment || source === "auto";

export type DirectoryEnvironmentAction = "set-work" | "clear-work" | "keep";

/**
 * What picking a directory does to Environment. Picking a work directory ticks to Work, and picking
 * any other directory unticks a Work value back to None — until the control holds a user choice,
 * which stops the syncing. Unticking only ever clears Work, so a scope typed through Package is
 * left alone.
 */
export const directoryEnvironmentAction = (
  source: EnvironmentSource,
  nextIsWork: boolean,
  chosenEnvironment: string,
): DirectoryEnvironmentAction => {
  if (source === "user") return "keep";
  if (nextIsWork) return chosenEnvironment === "work" ? "keep" : "set-work";
  return chosenEnvironment === "work" ? "clear-work" : "keep";
};

/**
 * Resolves an automatically chosen scope against the facets once discovery finishes. The form starts
 * before the collection is read, so an auto Work has nowhere to match yet and goes through the
 * "New…" sentinel; when the facets arrive holding that scope, the dropdown selects the existing
 * entry instead of keeping the extra field. Only ever moves an auto value onto its matching entry —
 * a user choice, and an auto value with nowhere to land, stay as they are. Returns the dropdown
 * value to select, or null to keep the current one.
 */
export const resolveAutoEnvironment = (
  source: EnvironmentSource,
  environment: string,
  newEnvironment: string,
  environments: { value: string }[],
  newValue: string,
): string | null => {
  if (source !== "auto") return null;
  if (environment !== newValue) return null;

  const typed = newEnvironment.trim();
  if (!typed) return null;

  return environments.some((entry) => entry.value === typed) ? typed : null;
};
