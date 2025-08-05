import type { ModuleDoc } from "../types";

export const Protocol: ModuleDoc = {
  functions: [
    {
      name: "extract_protocols/1",
      type: "function",
      specs: ["@spec extract_protocols([charlist() | String.t()]) :: [atom()]"],
      documentation:
        'Extracts all protocols from the given paths.\n\nThe paths can be either a charlist or a string. Internally\nthey are worked on as charlists, so passing them as lists\navoid extra conversion.\n\nDoes not load any of the protocols.\n\n## Examples\n\n    # Get Elixir\'s ebin directory path and retrieve all protocols\n    iex> path = Application.app_dir(:elixir, "ebin")\n    iex> mods = Protocol.extract_protocols([path])\n    iex> Enumerable in mods\n    true\n\n',
    },
    {
      name: "extract_impls/2",
      type: "function",
      specs: [
        "@spec extract_impls(module(), [charlist() | String.t()]) :: [atom()]",
      ],
      documentation:
        'Extracts all types implemented for the given protocol from\nthe given paths.\n\nThe paths can be either a charlist or a string. Internally\nthey are worked on as charlists, so passing them as lists\navoid extra conversion.\n\nDoes not load any of the implementations.\n\n## Examples\n\n    # Get Elixir\'s ebin directory path and retrieve all protocols\n    iex> path = Application.app_dir(:elixir, "ebin")\n    iex> mods = Protocol.extract_impls(Enumerable, [path])\n    iex> List in mods\n    true\n\n',
    },
    {
      name: "consolidated?/1",
      type: "function",
      specs: ["@spec consolidated?(module()) :: boolean()"],
      documentation: "Returns `true` if the protocol was consolidated.\n",
    },
    {
      name: "consolidate/2",
      type: "function",
      specs: [
        "@spec consolidate(module(), [module()]) ::\n        {:ok, binary()} | {:error, :not_a_protocol} | {:error, :no_beam_info}",
      ],
      documentation:
        "Receives a protocol and a list of implementations and\nconsolidates the given protocol.\n\nConsolidation happens by changing the protocol `impl_for`\nin the abstract format to have fast lookup rules. Usually\nthe list of implementations to use during consolidation\nare retrieved with the help of `extract_impls/2`.\n\nIt returns the updated version of the protocol bytecode.\nIf the first element of the tuple is `:ok`, it means\nthe protocol was consolidated.\n\nA given bytecode or protocol implementation can be checked\nto be consolidated or not by analyzing the protocol\nattribute:\n\n    Protocol.consolidated?(Enumerable)\n\nThis function does not load the protocol at any point\nnor loads the new bytecode for the compiled module.\nHowever, each implementation must be available and\nit will be loaded.\n",
    },
    {
      name: "assert_protocol!/1",
      type: "function",
      specs: ["@spec assert_protocol!(module()) :: :ok"],
      documentation:
        "Checks if the given module is loaded and is protocol.\n\nReturns `:ok` if so, otherwise raises `ArgumentError`.\n",
    },
    {
      name: "assert_impl!/2",
      type: "function",
      specs: ["@spec assert_impl!(module(), module()) :: :ok"],
      documentation:
        "Checks if the given module is loaded and is an implementation\nof the given protocol.\n\nReturns `:ok` if so, otherwise raises `ArgumentError`.\n",
    },
  ],
  name: "Protocol",
  callbacks: [],
  macros: [
    {
      name: "derive/3",
      type: "macro",
      specs: [],
      documentation:
        "Derives the `protocol` for `module` with the given options.\n\nIf your implementation passes options or if you are generating\ncustom code based on the struct, you will also need to implement\na macro defined as `__deriving__(module, struct, options)`\nto get the options that were passed.\n\n## Examples\n\n    defprotocol Derivable do\n      def ok(arg)\n    end\n\n    defimpl Derivable, for: Any do\n      defmacro __deriving__(module, struct, options) do\n        quote do\n          defimpl Derivable, for: unquote(module) do\n            def ok(arg) do\n              {:ok, arg, unquote(Macro.escape(struct)), unquote(options)}\n            end\n          end\n        end\n      end\n\n      def ok(arg) do\n        {:ok, arg}\n      end\n    end\n\n    defmodule ImplStruct do\n      @derive [Derivable]\n      defstruct a: 0, b: 0\n    end\n\n    Derivable.ok(%ImplStruct{})\n    #=> {:ok, %ImplStruct{a: 0, b: 0}, %ImplStruct{a: 0, b: 0}, []}\n\nExplicit derivations can now be called via `__deriving__/3`:\n\n    # Explicitly derived via `__deriving__/3`\n    Derivable.ok(%ImplStruct{a: 1, b: 1})\n    #=> {:ok, %ImplStruct{a: 1, b: 1}, %ImplStruct{a: 0, b: 0}, []}\n\n    # Explicitly derived by API via `__deriving__/3`\n    require Protocol\n    Protocol.derive(Derivable, ImplStruct, :oops)\n    Derivable.ok(%ImplStruct{a: 1, b: 1})\n    #=> {:ok, %ImplStruct{a: 1, b: 1}, %ImplStruct{a: 0, b: 0}, :oops}\n\n",
    },
  ],
  types: [],
};
