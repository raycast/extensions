import type { ModuleDoc } from "../types";

export const StringIO: ModuleDoc = {
  functions: [
    {
      name: "open/3",
      type: "function",
      specs: [
        "@spec open(binary(), keyword(), (pid() -> res)) :: {:ok, res} when res: var",
      ],
      documentation:
        'Creates an IO device.\n\n`string` will be the initial input of the newly created\ndevice.\n\nThe device will be created and sent to the function given.\nWhen the function returns, the device will be closed. The final\nresult will be a tuple with `:ok` and the result of the function.\n\n## Options\n\n  * `:capture_prompt` - if set to `true`, prompts (specified as\n    arguments to `IO.get*` functions) are captured in the output.\n    Defaults to `false`.\n\n  * `:encoding` (since v1.10.0) - encoding of the IO device. Allowed\n    values are `:unicode` (default) and `:latin1`.\n\n## Examples\n\n    iex> StringIO.open("foo", [], fn pid ->\n    ...>   input = IO.gets(pid, ">")\n    ...>   IO.write(pid, "The input was #{input}")\n    ...>   StringIO.contents(pid)\n    ...> end)\n    {:ok, {"", "The input was foo"}}\n\n    iex> StringIO.open("foo", [capture_prompt: true], fn pid ->\n    ...>   input = IO.gets(pid, ">")\n    ...>   IO.write(pid, "The input was #{input}")\n    ...>   StringIO.contents(pid)\n    ...> end)\n    {:ok, {"", ">The input was foo"}}\n\n',
    },
    {
      name: "open/2",
      type: "function",
      specs: [
        "@spec open(\n        binary(),\n        keyword()\n      ) :: {:ok, pid()}",
        "@spec open(binary(), (pid() -> res)) :: {:ok, res} when res: var",
      ],
      documentation:
        'Creates an IO device.\n\n`string` will be the initial input of the newly created\ndevice.\n\n`options_or_function` can be a keyword list of options or\na function.\n\nIf options are provided, the result will be `{:ok, pid}`, returning the\nIO device created. The option `:capture_prompt`, when set to `true`, causes\nprompts (which are specified as arguments to `IO.get*` functions) to be\nincluded in the device\'s output.\n\nIf a function is provided, the device will be created and sent to the\nfunction. When the function returns, the device will be closed. The final\nresult will be a tuple with `:ok` and the result of the function.\n\n## Examples\n\n    iex> {:ok, pid} = StringIO.open("foo")\n    iex> IO.gets(pid, ">")\n    "foo"\n    iex> StringIO.contents(pid)\n    {"", ""}\n\n    iex> {:ok, pid} = StringIO.open("foo", capture_prompt: true)\n    iex> IO.gets(pid, ">")\n    "foo"\n    iex> StringIO.contents(pid)\n    {"", ">"}\n\n    iex> StringIO.open("foo", fn pid ->\n    ...>   input = IO.gets(pid, ">")\n    ...>   IO.write(pid, "The input was #{input}")\n    ...>   StringIO.contents(pid)\n    ...> end)\n    {:ok, {"", "The input was foo"}}\n\n',
    },
    {
      name: "flush/1",
      type: "function",
      specs: ["@spec flush(pid()) :: binary()"],
      documentation:
        'Flushes the output buffer and returns its current contents.\n\n## Examples\n\n    iex> {:ok, pid} = StringIO.open("in")\n    iex> IO.write(pid, "out")\n    iex> StringIO.flush(pid)\n    "out"\n    iex> StringIO.contents(pid)\n    {"in", ""}\n\n',
    },
    {
      name: "contents/1",
      type: "function",
      specs: ["@spec contents(pid()) :: {binary(), binary()}"],
      documentation:
        'Returns the current input/output buffers for the given IO\ndevice.\n\n## Examples\n\n    iex> {:ok, pid} = StringIO.open("in")\n    iex> IO.write(pid, "out")\n    iex> StringIO.contents(pid)\n    {"in", "out"}\n\n',
    },
    {
      name: "close/1",
      type: "function",
      specs: ["@spec close(pid()) :: {:ok, {binary(), binary()}}"],
      documentation:
        'Stops the IO device and returns the remaining input/output\nbuffers.\n\n## Examples\n\n    iex> {:ok, pid} = StringIO.open("in")\n    iex> IO.write(pid, "out")\n    iex> StringIO.close(pid)\n    {:ok, {"in", "out"}}\n\n',
    },
  ],
  name: "StringIO",
  callbacks: [],
  macros: [],
  types: [],
};
