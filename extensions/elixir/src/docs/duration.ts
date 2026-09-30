import type { ModuleDoc } from "../types";

export const Duration: ModuleDoc = {
  functions: [
    {
      name: "to_iso8601/1",
      type: "function",
      specs: ["@spec to_iso8601(t()) :: String.t()"],
      documentation:
        'Converts the given `duration` to an [ISO 8601-2:2019](https://en.wikipedia.org/wiki/ISO_8601) formatted string.\n\nNote this function implements the *extension* of ISO 8601:2019. This extensions allows weeks to\nappear between months and days: `P3M3W3D`, making it fully compatible with any `Duration` struct.\n\n## Examples\n\n    iex> Duration.to_iso8601(Duration.new!(year: 3))\n    "P3Y"\n    iex> Duration.to_iso8601(Duration.new!(day: 40, hour: 12, minute: 42, second: 12))\n    "P40DT12H42M12S"\n    iex> Duration.to_iso8601(Duration.new!(second: 30))\n    "PT30S"\n\n    iex> Duration.to_iso8601(Duration.new!([]))\n    "PT0S"\n\n    iex> Duration.to_iso8601(Duration.new!(second: 1, microsecond: {2_200, 3}))\n    "PT1.002S"\n    iex> Duration.to_iso8601(Duration.new!(second: 1, microsecond: {-1_200_000, 4}))\n    "PT-0.2000S"\n',
    },
    {
      name: "subtract/2",
      type: "function",
      specs: ["@spec subtract(t(), t()) :: t()"],
      documentation:
        "Subtracts units of given durations `d1` and `d2`.\n\nRespects the the highest microsecond precision of the two.\n\n## Examples\n\n    iex> Duration.subtract(Duration.new!(week: 2, day: 1), Duration.new!(day: 2))\n    %Duration{week: 2, day: -1}\n    iex> Duration.subtract(Duration.new!(microsecond: {400, 6}), Duration.new!(microsecond: {600, 3}))\n    %Duration{microsecond: {-200, 6}}\n\n",
    },
    {
      name: "new!/1",
      type: "function",
      specs: ["@spec new!(duration()) :: t()"],
      documentation:
        "Creates a new `Duration` struct from given `unit_pairs`.\n\nRaises an `ArgumentError` when called with invalid unit pairs.\n\n## Examples\n\n    iex> Duration.new!(year: 1, week: 3, hour: 4, second: 1)\n    %Duration{year: 1, week: 3, hour: 4, second: 1}\n    iex> Duration.new!(second: 1, microsecond: {1000, 6})\n    %Duration{second: 1, microsecond: {1000, 6}}\n    iex> Duration.new!(month: 2)\n    %Duration{month: 2}\n\n",
    },
    {
      name: "negate/1",
      type: "function",
      specs: ["@spec negate(t()) :: t()"],
      documentation:
        "Negates `duration` units.\n\n## Examples\n\n    iex> Duration.negate(Duration.new!(day: 1, minute: 15, second: -10))\n    %Duration{day: -1, minute: -15, second: 10}\n    iex> Duration.negate(Duration.new!(microsecond: {500000, 4}))\n    %Duration{microsecond: {-500000, 4}}\n\n",
    },
    {
      name: "multiply/2",
      type: "function",
      specs: ["@spec multiply(t(), integer()) :: t()"],
      documentation:
        "Multiplies `duration` units by given `integer`.\n\n## Examples\n\n    iex> Duration.multiply(Duration.new!(day: 1, minute: 15, second: -10), 3)\n    %Duration{day: 3, minute: 45, second: -30}\n    iex> Duration.multiply(Duration.new!(microsecond: {200, 4}), 3)\n    %Duration{microsecond: {600, 4}}\n\n",
    },
    {
      name: "from_iso8601!/1",
      type: "function",
      specs: ["@spec from_iso8601!(String.t()) :: t()"],
      documentation:
        'Same as `from_iso8601/1` but raises an `ArgumentError`.\n\n## Examples\n\n    iex> Duration.from_iso8601!("P1Y2M3DT4H5M6S")\n    %Duration{year: 1, month: 2, day: 3, hour: 4, minute: 5, second: 6}\n    iex> Duration.from_iso8601!("P10D")\n    %Duration{day: 10}\n\n',
    },
    {
      name: "from_iso8601/1",
      type: "function",
      specs: [
        "@spec from_iso8601(String.t()) :: {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        'Parses an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Durations) formatted duration string to a `Duration` struct.\n\nDuration strings, as well as individual units, may be prefixed with plus/minus signs so that:\n\n- `-PT6H3M` parses as `%Duration{hour: -6, minute: -3}`\n- `-PT6H-3M` parses as `%Duration{hour: -6, minute: 3}`\n- `+PT6H3M` parses as `%Duration{hour: 6, minute: 3}`\n- `+PT6H-3M` parses as `%Duration{hour: 6, minute: -3}`\n\nDuration designators must be provided in order of magnitude: `P[n]Y[n]M[n]W[n]DT[n]H[n]M[n]S`.\n\nOnly seconds may be specified with a decimal fraction, using either a comma or a full stop: `P1DT4,5S`.\n\n## Examples\n\n    iex> Duration.from_iso8601("P1Y2M3DT4H5M6S")\n    {:ok, %Duration{year: 1, month: 2, day: 3, hour: 4, minute: 5, second: 6}}\n    iex> Duration.from_iso8601("P3Y-2MT3H")\n    {:ok, %Duration{year: 3, month: -2, hour: 3}}\n    iex> Duration.from_iso8601("-PT10H-30M")\n    {:ok, %Duration{hour: -10, minute: 30}}\n    iex> Duration.from_iso8601("PT4.650S")\n    {:ok, %Duration{second: 4, microsecond: {650000, 3}}}\n\n',
    },
    {
      name: "add/2",
      type: "function",
      specs: ["@spec add(t(), t()) :: t()"],
      documentation:
        "Adds units of given durations `d1` and `d2`.\n\nRespects the the highest microsecond precision of the two.\n\n## Examples\n\n    iex> Duration.add(Duration.new!(week: 2, day: 1), Duration.new!(day: 2))\n    %Duration{week: 2, day: 3}\n    iex> Duration.add(Duration.new!(microsecond: {400, 3}), Duration.new!(microsecond: {600, 6}))\n    %Duration{microsecond: {1000, 6}}\n\n",
    },
  ],
  name: "Duration",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "duration/0",
      type: "type",
      specs: ["@type duration() :: t() | [unit_pair()]"],
      documentation:
        "The duration type specifies a `%Duration{}` struct or a keyword list of valid duration unit pairs.\n",
    },
    {
      name: "unit_pair/0",
      type: "type",
      specs: [
        "@type unit_pair() ::\n        {:year, integer()}\n        | {:month, integer()}\n        | {:week, integer()}\n        | {:day, integer()}\n        | {:hour, integer()}\n        | {:minute, integer()}\n        | {:second, integer()}\n        | {:microsecond, {integer(), 0..6}}",
      ],
      documentation:
        "The unit pair type specifies a pair of a valid duration unit key and value.\n",
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Duration{\n        day: integer(),\n        hour: integer(),\n        microsecond: {integer(), 0..6},\n        minute: integer(),\n        month: integer(),\n        second: integer(),\n        week: integer(),\n        year: integer()\n      }",
      ],
      documentation: "The duration struct type.\n",
    },
  ],
};
