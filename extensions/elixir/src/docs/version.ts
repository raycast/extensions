import type { ModuleDoc } from "../types";

export const Version: ModuleDoc = {
  functions: [
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(t()) :: String.t()"],
      documentation:
        'Converts the given version to a string.\n\n### Examples\n\n    iex> Version.to_string(%Version{major: 1, minor: 2, patch: 3})\n    "1.2.3"\n    iex> Version.to_string(Version.parse!("1.14.0-rc.0+build0"))\n    "1.14.0-rc.0+build0"\n',
    },
    {
      name: "parse_requirement!/1",
      type: "function",
      specs: [
        "@spec parse_requirement!(String.t()) :: Version.Requirement.t()",
      ],
      documentation:
        'Parses a version requirement string into a `Version.Requirement` struct.\n\nIf `string` is an invalid requirement, a `Version.InvalidRequirementError` is raised.\n\n# Examples\n\n    iex> Version.parse_requirement!("== 2.0.1")\n    Version.parse_requirement!("== 2.0.1")\n\n    iex> Version.parse_requirement!("== == 2.0.1")\n    ** (Version.InvalidRequirementError) invalid requirement: "== == 2.0.1"\n\n',
    },
    {
      name: "parse_requirement/1",
      type: "function",
      specs: [
        "@spec parse_requirement(String.t()) :: {:ok, Version.Requirement.t()} | :error",
      ],
      documentation:
        'Parses a version requirement string into a `Version.Requirement` struct.\n\n## Examples\n\n    iex> {:ok, requirement} = Version.parse_requirement("== 2.0.1")\n    iex> requirement\n    Version.parse_requirement!("== 2.0.1")\n\n    iex> Version.parse_requirement("== == 2.0.1")\n    :error\n\n',
    },
    {
      name: "parse!/1",
      type: "function",
      specs: ["@spec parse!(String.t()) :: t()"],
      documentation:
        'Parses a version string into a `Version`.\n\nIf `string` is an invalid version, a `Version.InvalidVersionError` is raised.\n\n## Examples\n\n    iex> Version.parse!("2.0.1-alpha1")\n    %Version{major: 2, minor: 0, patch: 1, pre: ["alpha1"]}\n\n    iex> Version.parse!("2.0-alpha1")\n    ** (Version.InvalidVersionError) invalid version: "2.0-alpha1"\n\n',
    },
    {
      name: "parse/1",
      type: "function",
      specs: ["@spec parse(String.t()) :: {:ok, t()} | :error"],
      documentation:
        'Parses a version string into a `Version` struct.\n\n## Examples\n\n    iex> Version.parse("2.0.1-alpha1")\n    {:ok, %Version{major: 2, minor: 0, patch: 1, pre: ["alpha1"]}}\n\n    iex> Version.parse("2.0-alpha1")\n    :error\n\n',
    },
    {
      name: "match?/3",
      type: "function",
      specs: ["@spec match?(version(), requirement(), keyword()) :: boolean()"],
      documentation:
        'Checks if the given version matches the specification.\n\nReturns `true` if `version` satisfies `requirement`, `false` otherwise.\nRaises a `Version.InvalidRequirementError` exception if `requirement` is not\nparsable, or a `Version.InvalidVersionError` exception if `version` is not parsable.\nIf given an already parsed version and requirement this function won\'t\nraise.\n\n## Options\n\n  * `:allow_pre` (boolean) - when `false`, pre-release versions will not match\n    unless the operand is a pre-release version. Defaults to `true`.\n    For examples, please refer to the table above under the "Requirements" section.\n\n## Examples\n\n    iex> Version.match?("2.0.0", "> 1.0.0")\n    true\n\n    iex> Version.match?("2.0.0", "== 1.0.0")\n    false\n\n    iex> Version.match?("2.1.6-dev", "~> 2.1.2")\n    true\n\n    iex> Version.match?("2.1.6-dev", "~> 2.1.2", allow_pre: false)\n    false\n\n    iex> Version.match?("foo", "== 1.0.0")\n    ** (Version.InvalidVersionError) invalid version: "foo"\n\n    iex> Version.match?("2.0.0", "== == 1.0.0")\n    ** (Version.InvalidRequirementError) invalid requirement: "== == 1.0.0"\n\n',
    },
    {
      name: "compile_requirement/1",
      type: "function",
      specs: [
        "@spec compile_requirement(Version.Requirement.t()) :: Version.Requirement.t()",
      ],
      documentation:
        "Compiles a requirement to an internal representation that may optimize matching.\n\nThe internal representation is opaque.\n",
    },
    {
      name: "compare/2",
      type: "function",
      specs: ["@spec compare(version(), version()) :: :gt | :eq | :lt"],
      documentation:
        'Compares two versions.\n\nReturns `:gt` if the first version is greater than the second one, and `:lt`\nfor vice versa. If the two versions are equal, `:eq` is returned.\n\nPre-releases are strictly less than their corresponding release versions.\n\nPatch segments are compared lexicographically if they are alphanumeric, and\nnumerically otherwise.\n\nBuild segments are ignored: if two versions differ only in their build segment\nthey are considered to be equal.\n\nRaises a `Version.InvalidVersionError` exception if any of the two given\nversions are not parsable. If given an already parsed version this function\nwon\'t raise.\n\n## Examples\n\n    iex> Version.compare("2.0.1-alpha1", "2.0.0")\n    :gt\n\n    iex> Version.compare("1.0.0-beta", "1.0.0-rc1")\n    :lt\n\n    iex> Version.compare("1.0.0-10", "1.0.0-2")\n    :gt\n\n    iex> Version.compare("2.0.1+build0", "2.0.1")\n    :eq\n\n    iex> Version.compare("invalid", "2.0.1")\n    ** (Version.InvalidVersionError) invalid version: "invalid"\n\n',
    },
    {
      name: "__struct__/0",
      type: "function",
      specs: [],
      documentation:
        "The Version struct.\n\nIt contains the fields `:major`, `:minor`, `:patch`, `:pre`, and\n`:build` according to SemVer 2.0, where `:pre` is a list.\n\nYou can read those fields but you should not create a new `Version`\ndirectly via the struct syntax. Instead use the functions in this\nmodule.\n",
    },
  ],
  name: "Version",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Version{\n        build: build(),\n        major: major(),\n        minor: minor(),\n        patch: patch(),\n        pre: pre()\n      }",
      ],
      documentation: null,
    },
    {
      name: "build/0",
      type: "type",
      specs: ["@type build() :: String.t() | nil"],
      documentation: null,
    },
    {
      name: "pre/0",
      type: "type",
      specs: ["@type pre() :: [String.t() | non_neg_integer()]"],
      documentation: null,
    },
    {
      name: "patch/0",
      type: "type",
      specs: ["@type patch() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "minor/0",
      type: "type",
      specs: ["@type minor() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "major/0",
      type: "type",
      specs: ["@type major() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "requirement/0",
      type: "type",
      specs: ["@type requirement() :: String.t() | Version.Requirement.t()"],
      documentation: null,
    },
    {
      name: "version/0",
      type: "type",
      specs: ["@type version() :: String.t() | t()"],
      documentation: null,
    },
  ],
};
