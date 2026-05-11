import type { ModuleDoc } from "../types";

export const Atom: ModuleDoc = {
  functions: [
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(atom()) :: String.t()"],
      documentation:
        'Converts an atom to a string.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Atom.to_string(:foo)\n    "foo"\n\n',
    },
    {
      name: "to_charlist/1",
      type: "function",
      specs: ["@spec to_charlist(atom()) :: charlist()"],
      documentation:
        'Converts an atom to a charlist.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Atom.to_charlist(:"An atom")\n    ~c"An atom"\n\n',
    },
  ],
  name: "Atom",
  callbacks: [],
  macros: [],
  types: [],
};
