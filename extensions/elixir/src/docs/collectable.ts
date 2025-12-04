import type { ModuleDoc } from "../types";

export const Collectable: ModuleDoc = {
  functions: [
    {
      name: "into/1",
      type: "function",
      specs: [
        "@spec into(t()) ::\n        {initial_acc :: term(),\n         collector :: (term(), command() -> t() | term())}",
      ],
      documentation:
        "Returns an initial accumulator and a \"collector\" function.\n\nReceives a `collectable` which can be used as the initial accumulator that will\nbe passed to the function.\n\nThe collector function receives a term and a command and injects the term into\nthe collectable accumulator on every `{:cont, term}` command.\n\n`:done` is passed as a command when no further values will be injected. This\nis useful when there's a need to close resources or normalizing values. A\ncollectable must be returned when the command is `:done`.\n\nIf injection is suddenly interrupted, `:halt` is passed and the function\ncan return any value as it won't be used.\n\nFor examples on how to use the `Collectable` protocol and `into/1` see the\nmodule documentation.\n",
    },
  ],
  name: "Collectable",
  callbacks: [
    {
      name: "into/1",
      type: "callback",
      specs: [
        "@callback into(t()) ::\n            {initial_acc :: term(),\n             collector :: (term(), command() -> t() | term())}",
      ],
      documentation:
        "Returns an initial accumulator and a \"collector\" function.\n\nReceives a `collectable` which can be used as the initial accumulator that will\nbe passed to the function.\n\nThe collector function receives a term and a command and injects the term into\nthe collectable accumulator on every `{:cont, term}` command.\n\n`:done` is passed as a command when no further values will be injected. This\nis useful when there's a need to close resources or normalizing values. A\ncollectable must be returned when the command is `:done`.\n\nIf injection is suddenly interrupted, `:halt` is passed and the function\ncan return any value as it won't be used.\n\nFor examples on how to use the `Collectable` protocol and `into/1` see the\nmodule documentation.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: term()"],
      documentation: "All the types that implement this protocol.\n",
    },
    {
      name: "command/0",
      type: "type",
      specs: ["@type command() :: {:cont, term()} | :done | :halt"],
      documentation: null,
    },
  ],
};
