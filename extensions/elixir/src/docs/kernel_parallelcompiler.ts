import type { ModuleDoc } from "../types";

export const Kernel_ParallelCompiler: ModuleDoc = {
  functions: [
    {
      name: "require/2",
      type: "function",
      specs: [
        "@spec require(\n        [Path.t()],\n        keyword()\n      ) ::\n        {:ok, [atom()], [warning()] | info()}\n        | {:error, [error()] | [Code.diagnostic(:error)], [warning()] | info()}",
      ],
      documentation:
        "Requires the given files in parallel.\n\nOpposite to compile, dependencies are not attempted to be\nautomatically solved between files.\n\nIt returns `{:ok, modules, warnings}` or `{:error, errors, warnings}`\nby default but we recommend using `return_diagnostics: true` so it returns\ndiagnostics as maps as well as a map of compilation information.\nThe map has the shape of:\n\n    %{\n      runtime_warnings: [warning],\n      compile_warnings: [warning]\n    }\n\n## Options\n\n  * `:each_file` - for each file compiled, invokes the callback passing the\n    file\n\n  * `:each_module` - for each module compiled, invokes the callback passing\n    the file, module and the module bytecode\n\n",
    },
    {
      name: "pmap/2",
      type: "function",
      specs: [],
      documentation:
        "Perform parallel compilation of `collection` with `fun`.\n\nIf you have a file that needs to compile other modules in parallel,\nthe spawned processes need to be aware of the compiler environment.\nThis function allows a developer to perform such tasks.\n",
    },
    {
      name: "compile_to_path/3",
      type: "function",
      specs: [
        "@spec compile_to_path([Path.t()], Path.t(), keyword()) ::\n        {:ok, [atom()], [warning()] | info()}\n        | {:error, [error()] | [Code.diagnostic(:error)], [warning()] | info()}",
      ],
      documentation:
        "Compiles the given files and writes resulting BEAM files into path.\n\nSee `compile/2` for more information.\n",
    },
    {
      name: "compile/2",
      type: "function",
      specs: [
        "@spec compile(\n        [Path.t()],\n        keyword()\n      ) ::\n        {:ok, [atom()], [warning()] | info()}\n        | {:error, [error()] | [Code.diagnostic(:error)], [warning()] | info()}",
      ],
      documentation:
        "Compiles the given files.\n\nThose files are compiled in parallel and can automatically\ndetect dependencies between them. Once a dependency is found,\nthe current file stops being compiled until the dependency is\nresolved.\n\nIt returns `{:ok, modules, warnings}` or `{:error, errors, warnings}`\nby default but we recommend using `return_diagnostics: true` so it returns\ndiagnostics as maps as well as a map of compilation information.\nThe map has the shape of:\n\n    %{\n      runtime_warnings: [warning],\n      compile_warnings: [warning]\n    }\n\n## Options\n\n  * `:each_file` - for each file compiled, invokes the callback passing the\n    file\n\n  * `:each_long_compilation` - for each file that takes more than a given\n    timeout (see the `:long_compilation_threshold` option) to compile, invoke\n    this callback passing the file as its argument\n\n  * `:each_module` - for each module compiled, invokes the callback passing\n    the file, module and the module bytecode\n\n  * `:each_cycle` - after the given files are compiled, invokes this function\n    that should return the following values:\n    * `{:compile, modules, warnings}` - to continue compilation with a list of\n      further modules to compile\n    * `{:runtime, modules, warnings}` - to stop compilation and verify the list\n      of modules because dependent modules have changed\n\n  * `:long_compilation_threshold` - the timeout (in seconds) to check for modules\n    taking too long to compile. For each file that exceeds the threshold, the\n    `:each_long_compilation` callback is invoked. From Elixir v1.11, only the time\n    spent compiling the actual module is taken into account by the threshold, the\n    time spent waiting is not considered. Defaults to `10` seconds.\n\n  * `:profile` - if set to `:time` measure the compilation time of each compilation cycle\n     and group pass checker\n\n  * `:dest` - the destination directory for the BEAM files. When using `compile/2`,\n    this information is only used to properly annotate the BEAM files before\n    they are loaded into memory. If you want a file to actually be written to\n    `dest`, use `compile_to_path/3` instead.\n\n  * `:beam_timestamp` - the modification timestamp to give all BEAM files\n\n  * `:return_diagnostics` (since v1.15.0) - returns maps with information instead of\n    a list of warnings and returns diagnostics as maps instead of tuples\n\n",
    },
    {
      name: "async/1",
      type: "function",
      specs: [],
      documentation: "Starts a task for parallel compilation.\n",
    },
  ],
  name: "Kernel.ParallelCompiler",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "error/0",
      type: "type",
      specs: [
        "@type error() :: {file :: Path.t(), Code.position(), message :: String.t()}",
      ],
      documentation: null,
    },
    {
      name: "warning/0",
      type: "type",
      specs: [
        "@type warning() :: {file :: Path.t(), Code.position(), message :: String.t()}",
      ],
      documentation: null,
    },
    {
      name: "info/0",
      type: "type",
      specs: [
        "@type info() :: %{\n        runtime_warnings: [Code.diagnostic(:warning)],\n        compile_warnings: [Code.diagnostic(:warning)]\n      }",
      ],
      documentation: null,
    },
  ],
};
