import type { TypesProps } from "@jeromefitz/conventional-gitmoji";
import { types } from "@jeromefitz/conventional-gitmoji";

export type GitmojiFormat = {
  title: string;
  value: string;
};

interface GitmojiTypes {
  format: string;
  formats: GitmojiFormat[];
  types: TypesProps;
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
