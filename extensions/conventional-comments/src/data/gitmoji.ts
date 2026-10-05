// Raycast's build pipeline supports this ESM package, but `tsc` reports an interop
// error for this ESM-only package even with Node16 module resolution.
// @ts-expect-error ESM-only package consumed by Raycast bundler
import { types } from "@jeromefitz/conventional-gitmoji";

export type GitmojiFormat = {
  title: string;
  value: string;
};

interface GitmojiTypes {
  format: string;
  formats: GitmojiFormat[];
  types: Record<
    string,
    {
      commit: string;
      description: string;
      emoji: string;
    }
  >;
}

const gitmoji: GitmojiTypes = {
  format: "{emoji}{scope} {description}",
  formats: [
    { title: "♻️ (scope) description", value: "{emoji}{scope} {description}" },
    { title: "♻️ (scope): description", value: "{emoji}{scope}: {description}" },
    { title: "♻️ refactor(scope): description", value: "{emoji}{type}{scope}: {description}" },
    { title: "refactor(scope): description", value: "{type}{scope}: {description}" },
  ],
  types,
};

export default gitmoji;
