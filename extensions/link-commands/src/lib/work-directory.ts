/**
 * Whether a script directory is a work one: any `work` segment in the path counts, so
 * `~/dotfiles/profiles/work/scripts` is work and `~/scripts` is not. The match is
 * on whole segments, so `~/workscripts` stays personal, and it is case-sensitive — a `Work`
 * folder is a display name, not the convention this looks for.
 */
export const isWorkPath = (path: string) => path.split("/").includes("work");
