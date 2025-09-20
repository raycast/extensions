# Script responsible for generating .ts files for each of Elixir's modules documentation.
# This script will generate one .ts file for each module, under the `src/docs/` folder, for example, for the `String`
# module, the file will be `src/docs/string.ts`.
#
# Usage
#
# `elixir doc_builder.exs`
#
# You can also pass the `--modules` option to specify which modules you want to generate the .ts files for.
#
# `elixir doc_builder.exs --modules File`
#
# The above would only generate documentation for the `File` module under `src/docs/file.ts`.

Mix.install([:jason])

# Default list of modules for which to generate a TypeScript file.
# This can be overriden by the `--modules` flag.
default_modules = [
  Kernel,
  Kernel.SpecialForms,
  Atom,
  Base,
  Bitwise,
  Date,
  DateTime,
  Duration,
  Exception,
  Float,
  Function,
  Integer,
  Module,
  NaiveDateTime,
  Record,
  Regex,
  String,
  Time,
  Tuple,
  URI,
  Version,
  Version.Requirement,
  Access,
  Date.Range,
  Enum,
  Keyword,
  List,
  Map,
  MapSet,
  Range,
  Stream,
  File,
  File.Stat,
  File.Stream,
  IO,
  IO.ANSI,
  IO.Stream,
  OptionParser,
  Path,
  Port,
  StringIO,
  System,
  Calendar,
  Calendar.ISO,
  Calendar.TimeZoneDatabase,
  Calendar.UTCOnlyTimeZoneDatabase,
  Agent,
  Application,
  Config,
  Config.Provider,
  Config.Reader,
  DynamicSupervisor,
  GenServer,
  Node,
  PartitionSupervisor,
  Process,
  Registry,
  Supervisor,
  Task,
  Task.Supervisor,
  Collectable,
  Enumerable,
  Inspect,
  Inspect.Algebra,
  Inspect.Opts,
  List.Chars,
  Protocol,
  String.Chars,
  Code,
  Code.Fragment,
  Kernel.ParallelCompiler,
  Macro,
  Macro.Env
]

defmodule Helper do
  @typep base(t) :: %{name: String.t(), specs: [String.t()], documentation: String.t(), type: t}
  @typep func :: base(:function)
  @typep macro :: base(:macro)
  @typep type :: base(:type)
  @typep callback :: base(:callback)

  @typep function_docs :: %{
           functions: [function()],
           macros: [macro()],
           types: [type()],
           callback: [callback()]
         }

  @typep module_doc :: %{
           name: String.t(),
           functions: [function()],
           macros: [macro()],
           types: [type()],
           callback: [callback()]
         }

  @initial_value %{functions: [], macros: [], types: [], callbacks: []}

  @spec function_docs(module(), tuple()) :: function_docs()
  def function_docs(module, {:docs_v1, _, :elixir, _, _, _, functions}) do
    functions
    |> Enum.reduce(@initial_value, fn function, map ->
      case function_doc(module, function) do
        nil -> map
        %{type: :function} = doc -> Map.update(map, :functions, [doc], &[doc | &1])
        %{type: :macro} = doc -> Map.update(map, :macros, [doc], &[doc | &1])
        %{type: :type} = doc -> Map.update(map, :types, [doc], &[doc | &1])
        %{type: :callback} = doc -> Map.update(map, :callbacks, [doc], &[doc | &1])
      end
    end)
  end

  # Ignore the following documentation for now:
  # - Deprecated functions.
  # - Types.
  # - Macros.
  # - Callbacks.
  @spec function_doc(module(), tuple()) :: nil | func() | macro() | type() | callback()
  defp function_doc(_module, {{:function, _name, _arity}, _, _, :hidden, _}), do: nil
  defp function_doc(_module, {{:macro, _name, _arity}, _, _, :hidden, _}), do: nil
  defp function_doc(_module, {{:type, _, _}, _, _, :hidden, _}), do: nil
  defp function_doc(_module, {{:callback, _, _}, _, _, :hidden, _}), do: nil

  defp function_doc(module, {{type, name, arity}, _, _, documentation, _}) do
    documentation = if documentation == :none, do: nil, else: Map.get(documentation, "en")

    specs =
      case type do
        :type -> type_specs(module, name)
        :callback -> function_specs(module, name, arity, :callback)
        _ -> function_specs(module, name, arity)
      end

    %{
      name: "#{name}/#{arity}",
      specs: specs,
      documentation: documentation,
      type: type
    }
  end

  @spec function_specs(module(), atom(), integer(), :spec | :callback) :: [String.t()]
  defp function_specs(module, name, arity, type \\ :spec) do
    with {:ok, module_specs} <- Code.Typespec.fetch_specs(module),
         {_, function_specs} <- List.keyfind(module_specs, {name, arity}, 0) do
      function_specs
      |> Enum.map(fn spec -> Code.Typespec.spec_to_quoted(name, spec) end)
      |> Enum.map(fn spec -> format_typespec(spec, type) end)
    else
      _ -> []
    end
  end

  @spec type_specs(module(), atom()) :: [String.t()]
  defp type_specs(module, type) do
    with {:ok, module_types} <- Code.Typespec.fetch_types(module) do
      module_types
      |> Enum.filter(&match?({kind, {^type, _, _}} when kind in [:type, :opaque], &1))
      |> Enum.sort_by(fn {_, {name, _, args}} -> {name, length(args)} end)
      |> Enum.map(&format_type/1)
    else
      _ -> []
    end
  end

  defp format_type({:opaque, type}) do
    {:"::", _, [ast, _]} = Code.Typespec.type_to_quoted(type)
    format_typespec(ast, :opaque)
  end

  defp format_type({kind, type}) do
    ast = Code.Typespec.type_to_quoted(type)
    format_typespec(ast, kind)
  end

  @spec format_typespec(Macro.t(), atom()) :: binary()
  defp format_typespec(definition, type) do
    {:@, [], [{type, [], [definition]}]}
    |> Code.quoted_to_algebra()
    |> Inspect.Algebra.format(IEx.Config.width())
    |> IO.iodata_to_binary()
  end

  @spec build_ts_file(module_doc()) :: String.t()
  def build_ts_file(module_doc) do
    # For modules like `Kernel.SpecialForms`, we can't use the module name as the constant name in Javascript.
    # We'll replace the `.` with `_` to make it a valid constant name.
    const_name = String.replace(module_doc.name, ".", "_")

    """
    import type { ModuleDoc } from "../types";

    export const #{const_name}: ModuleDoc =
    #{Jason.encode!(module_doc)}
    """
  end

  @doc """
  Given a module's name, returns the corresponding file name for the TypeScript file.

  ## Examples

      iex> file_name("String")
      "string.ts"

      iex> file_name("Kernel.SpecialForms")
      "kernel_specialforms.ts"
  """
  def file_name(module_name), do: module_name |> String.downcase() |> String.replace(".", "_")
end

modules =
  case OptionParser.parse(System.argv(), strict: [modules: :string]) do
    {[modules: modules], [], []} ->
      modules
      |> String.split(",")
      |> Enum.map(fn module -> String.to_existing_atom("Elixir.#{module}") end)

    _ ->
      default_modules
  end

modules
|> Enum.map(fn module -> {module, Code.fetch_docs(module)} end)
|> Enum.map(fn {module, module_docs} -> {module, Helper.function_docs(module, module_docs)} end)
|> Enum.map(fn {module, function_docs} ->
  {String.replace(to_string(module), "Elixir.", ""), function_docs}
end)
|> Enum.map(fn {module, function_docs} -> Map.put(function_docs, :name, module) end)
|> Enum.each(fn module_doc ->
  File.write!(
    "src/docs/#{Helper.file_name(module_doc.name)}.ts",
    Helper.build_ts_file(module_doc)
  )
end)
