import type { ModuleDoc } from "../types";

export const Path: ModuleDoc = {
  functions: [
    {
      name: "wildcard/2",
      type: "function",
      specs: [
        "@spec wildcard(\n        t(),\n        keyword()\n      ) :: [binary()]",
      ],
      documentation:
        'Traverses paths according to the given `glob` expression and returns a\nlist of matches.\n\nThe wildcard looks like an ordinary path, except that the following\n"wildcard characters" are interpreted in a special way:\n\n  * `?` - matches one character.\n\n  * `*` - matches any number of characters up to the end of the filename, the\n    next dot, or the next slash.\n\n  * `**` - two adjacent `*`\'s used as a single pattern will match all\n    files and zero or more directories and subdirectories.\n\n  * `[char1,char2,...]` - matches any of the characters listed; two\n    characters separated by a hyphen will match a range of characters.\n    Do not add spaces before and after the comma as it would then match\n    paths containing the space character itself.\n\n  * `{item1,item2,...}` - matches one of the alternatives.\n    Do not add spaces before and after the comma as it would then match\n    paths containing the space character itself.\n\nOther characters represent themselves. Only paths that have\nexactly the same character in the same position will match. Note\nthat matching is case-sensitive: `"a"` will not match `"A"`.\n\nDirectory separators must always be written as `/`, even on Windows.\nYou may call `Path.expand/1` to normalize the path before invoking\nthis function.\n\nA character preceded by `\\\\` loses its special meaning.\nNote that `\\\\` must be written as `\\\\\\\\` in a string literal.\nFor example, `"\\\\\\\\?*"` will match any filename starting with `?.`.\n\nBy default, the patterns `*` and `?` do not match files starting\nwith a dot `.`. See the `:match_dot` option in the "Options" section\nbelow.\n\n## Options\n\n  * `:match_dot` - (boolean) if `false`, the special wildcard characters `*` and `?`\n    will not match files starting with a dot (`.`). If `true`, files starting with\n    a `.` will not be treated specially. Defaults to `false`.\n\n## Examples\n\nImagine you have a directory called `projects` with three Elixir projects\ninside of it: `elixir`, `ex_doc`, and `plug`. You can find all `.beam` files\ninside the `ebin` directory of each project as follows:\n\n    Path.wildcard("projects/*/ebin/**/*.beam")\n\nIf you want to search for both `.beam` and `.app` files, you could do:\n\n    Path.wildcard("projects/*/ebin/**/*.{beam,app}")\n\n',
    },
    {
      name: "type/1",
      type: "function",
      specs: ["@spec type(t()) :: :absolute | :relative | :volumerelative"],
      documentation:
        'Returns the path type.\n\n## Examples\n\n### Unix-like operating systems\n\n    Path.type("/")                #=> :absolute\n    Path.type("/usr/local/bin")   #=> :absolute\n    Path.type("usr/local/bin")    #=> :relative\n    Path.type("../usr/local/bin") #=> :relative\n    Path.type("~/file")           #=> :relative\n\n### Windows\n\n    Path.type("D:/usr/local/bin") #=> :absolute\n    Path.type("usr/local/bin")    #=> :relative\n    Path.type("D:bar.ex")         #=> :volumerelative\n    Path.type("/bar/foo.ex")      #=> :volumerelative\n\n',
    },
    {
      name: "split/1",
      type: "function",
      specs: ["@spec split(t()) :: [binary()]"],
      documentation:
        'Splits the path into a list at the path separator.\n\nIf an empty string is given, returns an empty list.\n\nOn Windows, path is split on both `"\\"` and `"/"` separators\nand the driver letter, if there is one, is always returned\nin lowercase.\n\n## Examples\n\n    iex> Path.split("")\n    []\n\n    iex> Path.split("foo")\n    ["foo"]\n\n    iex> Path.split("/foo/bar")\n    ["/", "foo", "bar"]\n\n',
    },
    {
      name: "safe_relative_to/2",
      type: "function",
      specs: ["@spec safe_relative_to(t(), t()) :: {:ok, binary()} | :error"],
      documentation:
        "Returns a relative path that is protected from directory-traversal attacks.\n\nSee `safe_relative/2` for a non-deprecated version of this API.\n",
    },
    {
      name: "safe_relative/2",
      type: "function",
      specs: ["@spec safe_relative(t(), t()) :: {:ok, binary()} | :error"],
      documentation:
        'Returns a relative path that is protected from directory-traversal attacks.\n\nThe given relative path is sanitized by eliminating `..` and `.` components.\n\nThis function checks that, after expanding those components, the path is still "safe".\nPaths are considered unsafe if either of these is true:\n\n  * The path is not relative, such as `"/foo/bar"`.\n\n  * A `..` component would make it so that the path would traverse up above\n    the root of `relative_to`.\n\n  * A symbolic link in the path points to something above the root of `cwd`.\n\n## Examples\n\n    iex> Path.safe_relative("foo")\n    {:ok, "foo"}\n\n    iex> Path.safe_relative("deps/my_dep/app.beam")\n    {:ok, "deps/my_dep/app.beam"}\n\n    iex> Path.safe_relative("deps/my_dep/./build/../app.beam", File.cwd!())\n    {:ok, "deps/my_dep/app.beam"}\n\n    iex> Path.safe_relative("my_dep/../..")\n    :error\n\n    iex> Path.safe_relative("/usr/local", File.cwd!())\n    :error\n\n',
    },
    {
      name: "rootname/2",
      type: "function",
      specs: ["@spec rootname(t(), t()) :: binary()"],
      documentation:
        'Returns the `path` with the `extension` stripped.\n\nThis function should be used to remove a specific extension which may\nor may not be there.\n\n## Examples\n\n    iex> Path.rootname("/foo/bar.erl", ".erl")\n    "/foo/bar"\n\n    iex> Path.rootname("/foo/bar.erl", ".ex")\n    "/foo/bar.erl"\n\n',
    },
    {
      name: "rootname/1",
      type: "function",
      specs: ["@spec rootname(t()) :: binary()"],
      documentation:
        'Returns the `path` with the `extension` stripped.\n\n## Examples\n\n    iex> Path.rootname("/foo/bar")\n    "/foo/bar"\n\n    iex> Path.rootname("/foo/bar.ex")\n    "/foo/bar"\n\n',
    },
    {
      name: "relative_to_cwd/2",
      type: "function",
      specs: [
        "@spec relative_to_cwd(\n        t(),\n        keyword()\n      ) :: binary()",
      ],
      documentation:
        "Convenience to get the path relative to the current working\ndirectory.\n\nIf, for some reason, the current working directory\ncannot be retrieved, this function returns the given `path`.\n\nCheck `relative_to/3` for the supported options.\n",
    },
    {
      name: "relative_to/3",
      type: "function",
      specs: ["@spec relative_to(t(), t(), keyword()) :: binary()"],
      documentation:
        'Returns the direct relative path from `path` in relation to `cwd`.\n\nIn other words, this function attempts to return a path such that\n`Path.expand(result, cwd)` points to `path`. This function aims\nto return a relative path whenever possible, but that\'s not guaranteed:\n\n  * If both paths are relative, a relative path is always returned\n\n  * If both paths are absolute, a relative path may be returned if\n    they share a common prefix. You can pass the `:force` option to\n    force this function to traverse up, but even then a relative\n    path is not guaranteed (for example, if the absolute paths\n    belong to different drives on Windows)\n\n  * If a mixture of paths are given, the result will always match\n    the given `path` (the first argument)\n\nThis function expands `.` and `..` entries without traversing the\nfile system, so it assumes no symlinks between the paths. See\n`safe_relative_to/2` for a safer alternative.\n\n## Options\n\n  * `:force` - (boolean since v1.16.0) if `true` forces a relative\n  path to be returned by traversing the path up. Except if the paths\n  are in different volumes on Windows. Defaults to `false`.\n\n## Examples\n\n### With relative `cwd`\n\nIf both paths are relative, a minimum path is computed:\n\n    Path.relative_to("tmp/foo/bar", "tmp")      #=> "foo/bar"\n    Path.relative_to("tmp/foo/bar", "tmp/foo")  #=> "bar"\n    Path.relative_to("tmp/foo/bar", "tmp/bat")  #=> "../foo/bar"\n\nIf an absolute path is given with relative `cwd`, it is returned as:\n\n    Path.relative_to("/usr/foo/bar", "tmp/bat")  #=> "/usr/foo/bar"\n\n### With absolute `cwd`\n\nIf both paths are absolute, a relative is computed if possible,\nwithout traversing up:\n\n    Path.relative_to("/usr/local/foo", "/usr/local")      #=> "foo"\n    Path.relative_to("/usr/local/foo", "/")               #=> "usr/local/foo"\n    Path.relative_to("/usr/local/foo", "/etc")            #=> "/usr/local/foo"\n    Path.relative_to("/usr/local/foo", "/usr/local/foo")  #=> "."\n    Path.relative_to("/usr/local/../foo", "/usr/foo")     #=> "."\n    Path.relative_to("/usr/local/../foo/bar", "/usr/foo") #=> "bar"\n\nIf `:force` is set to `true` paths are traversed up:\n\n    Path.relative_to("/usr", "/usr/local", force: true)          #=> ".."\n    Path.relative_to("/usr/foo", "/usr/local", force: true)      #=> "../foo"\n    Path.relative_to("/usr/../foo/bar", "/etc/foo", force: true) #=> "../../foo/bar"\n\nIf a relative path is given, it is assumed to be relative to the\ngiven path, so the path is returned with "." and ".." expanded:\n\n    Path.relative_to(".", "/usr/local")          #=> "."\n    Path.relative_to("foo", "/usr/local")        #=> "foo"\n    Path.relative_to("foo/../bar", "/usr/local") #=> "bar"\n    Path.relative_to("foo/..", "/usr/local")     #=> "."\n    Path.relative_to("../foo", "/usr/local")     #=> "../foo"\n\n',
    },
    {
      name: "relative/1",
      type: "function",
      specs: ["@spec relative(t()) :: binary()"],
      documentation:
        'Forces the path to be a relative path.\n\nIf an absolute path is given, it is stripped from its root component.\n\n## Examples\n\n### Unix-like operating systems\n\n    Path.relative("/usr/local/bin")   #=> "usr/local/bin"\n    Path.relative("usr/local/bin")    #=> "usr/local/bin"\n    Path.relative("../usr/local/bin") #=> "../usr/local/bin"\n\n### Windows\n\n    Path.relative("D:/usr/local/bin") #=> "usr/local/bin"\n    Path.relative("usr/local/bin")    #=> "usr/local/bin"\n    Path.relative("D:bar.ex")         #=> "bar.ex"\n    Path.relative("/bar/foo.ex")      #=> "bar/foo.ex"\n\n',
    },
    {
      name: "join/2",
      type: "function",
      specs: ["@spec join(t(), t()) :: binary()"],
      documentation:
        'Joins two paths.\n\nThe right path will always be expanded to its relative format\nand any trailing slash will be removed when joining.\n\n## Examples\n\n    iex> Path.join("foo", "bar")\n    "foo/bar"\n\n    iex> Path.join("/foo", "/bar/")\n    "/foo/bar"\n\nThe functions in this module support chardata, so giving a list will\ntreat it as a single entity:\n\n    iex> Path.join("foo", ["bar", "fiz"])\n    "foo/barfiz"\n\n    iex> Path.join(["foo", "bar"], "fiz")\n    "foobar/fiz"\n\nUse `join/1` if you need to join a list of paths instead.\n',
    },
    {
      name: "join/1",
      type: "function",
      specs: ["@spec join([t(), ...]) :: binary()"],
      documentation:
        'Joins a list of paths.\n\nThis function should be used to convert a list of paths to a path.\nNote that any trailing slash is removed when joining.\n\nRaises an error if the given list of paths is empty.\n\n## Examples\n\n    iex> Path.join(["~", "foo"])\n    "~/foo"\n\n    iex> Path.join(["foo"])\n    "foo"\n\n    iex> Path.join(["/", "foo", "bar/"])\n    "/foo/bar"\n\n',
    },
    {
      name: "extname/1",
      type: "function",
      specs: ["@spec extname(t()) :: binary()"],
      documentation:
        'Returns the extension of the last component of `path`.\n\nFor filenames starting with a dot and without an extension, it returns\nan empty string.\n\nSee `basename/1` and `rootname/1` for related functions to extract\ninformation from paths.\n\n## Examples\n\n    iex> Path.extname("foo.erl")\n    ".erl"\n\n    iex> Path.extname("~/foo/bar")\n    ""\n\n    iex> Path.extname(".gitignore")\n    ""\n\n',
    },
    {
      name: "expand/2",
      type: "function",
      specs: ["@spec expand(t(), t()) :: binary()"],
      documentation:
        'Expands the path relative to the path given as the second argument\nexpanding any `.` and `..` characters.\n\nIf the path is already an absolute path, `relative_to` is ignored.\n\nNote that this function treats a `path` with a leading `~` as\nan absolute one.\n\nThe second argument is first expanded to an absolute path.\n\n## Examples\n\n    # Assuming that the absolute path to baz is /quux/baz\n    Path.expand("foo/bar/../bar", "baz")\n    #=> "/quux/baz/foo/bar"\n\n    Path.expand("foo/bar/../bar", "/baz")\n    #=> "/baz/foo/bar"\n\n    Path.expand("/foo/bar/../bar", "/baz")\n    #=> "/foo/bar"\n\n',
    },
    {
      name: "expand/1",
      type: "function",
      specs: ["@spec expand(t()) :: binary()"],
      documentation:
        'Converts the path to an absolute one, expanding\nany `.` and `..` components and a leading `~`.\n\nIf a relative path is provided it is expanded relatively to\nthe current working directory.\n\n## Examples\n\n    Path.expand("/foo/bar/../baz")\n    #=> "/foo/baz"\n\n    Path.expand("foo/bar/../baz")\n    #=> "$PWD/foo/baz"\n\n',
    },
    {
      name: "dirname/1",
      type: "function",
      specs: ["@spec dirname(t()) :: binary()"],
      documentation:
        'Returns the directory component of `path`.\n\n## Examples\n\n    iex> Path.dirname("/foo/bar.ex")\n    "/foo"\n\n    iex> Path.dirname("/foo/bar/baz.ex")\n    "/foo/bar"\n\n    iex> Path.dirname("/foo/bar/")\n    "/foo/bar"\n\n    iex> Path.dirname("bar.ex")\n    "."\n\n',
    },
    {
      name: "basename/2",
      type: "function",
      specs: ["@spec basename(t(), t()) :: binary()"],
      documentation:
        'Returns the last component of `path` with the `extension`\nstripped.\n\nThis function should be used to remove a specific\nextension which may or may not be there.\n\n## Examples\n\n    iex> Path.basename("~/foo/bar.ex", ".ex")\n    "bar"\n\n    iex> Path.basename("~/foo/bar.exs", ".ex")\n    "bar.exs"\n\n    iex> Path.basename("~/foo/bar.old.ex", ".ex")\n    "bar.old"\n\n',
    },
    {
      name: "basename/1",
      type: "function",
      specs: ["@spec basename(t()) :: binary()"],
      documentation:
        'Returns the last component of the path or the path\nitself if it does not contain any directory separators.\n\n## Examples\n\n    iex> Path.basename("foo")\n    "foo"\n\n    iex> Path.basename("foo/bar")\n    "bar"\n\n    iex> Path.basename("lib/module/submodule.ex")\n    "submodule.ex"\n\n    iex> Path.basename("/")\n    ""\n\n',
    },
    {
      name: "absname/2",
      type: "function",
      specs: ["@spec absname(t(), t() | (-> t())) :: binary()"],
      documentation:
        'Builds a path from `relative_to` to `path`.\n\nIf `path` is already an absolute path, `relative_to` is ignored. See also\n`relative_to/3`. `relative_to` is either a path or an anonymous function,\nwhich is invoked only when necessary, that returns a path.\n\nUnlike `expand/2`, no attempt is made to resolve `..`, `.` or `~`.\n\n## Examples\n\n    iex> Path.absname("foo", "bar")\n    "bar/foo"\n\n    iex> Path.absname("../x", "bar")\n    "bar/../x"\n\n    iex> Path.absname("foo", fn -> "lazy" end)\n    "lazy/foo"\n\n',
    },
    {
      name: "absname/1",
      type: "function",
      specs: ["@spec absname(t()) :: binary()"],
      documentation:
        'Converts the given path to an absolute one.\n\nUnlike `expand/1`, no attempt is made to resolve `..`, `.`, or `~`.\n\n## Examples\n\n### Unix-like operating systems\n\n    Path.absname("foo")\n    #=> "/usr/local/foo"\n\n    Path.absname("../x")\n    #=> "/usr/local/../x"\n\n### Windows\n\n    Path.absname("foo")\n    #=> "D:/usr/local/foo"\n\n    Path.absname("../x")\n    #=> "D:/usr/local/../x"\n\n',
    },
  ],
  name: "Path",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: IO.chardata()"],
      documentation: "A path.\n",
    },
  ],
};
