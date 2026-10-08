import type { ModuleDoc } from "../types";

export const Time: ModuleDoc = {
  functions: [
    {
      name: "utc_now/1",
      type: "function",
      specs: ["@spec utc_now(Calendar.calendar()) :: t()"],
      documentation:
        "Returns the current time in UTC.\n\n## Examples\n\n    iex> time = Time.utc_now()\n    iex> time.hour >= 0\n    true\n\n",
    },
    {
      name: "truncate/2",
      type: "function",
      specs: [
        "@spec truncate(t(), :microsecond | :millisecond | :second) :: t()",
      ],
      documentation:
        "Returns the given time with the microsecond field truncated to the given\nprecision (`:microsecond`, `millisecond` or `:second`).\n\nThe given time is returned unchanged if it already has lower precision than\nthe given precision.\n\n## Examples\n\n    iex> Time.truncate(~T[01:01:01.123456], :microsecond)\n    ~T[01:01:01.123456]\n\n    iex> Time.truncate(~T[01:01:01.123456], :millisecond)\n    ~T[01:01:01.123]\n\n    iex> Time.truncate(~T[01:01:01.123456], :second)\n    ~T[01:01:01]\n\n",
    },
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(Calendar.time()) :: String.t()"],
      documentation:
        'Converts the given `time` to a string.\n\n### Examples\n\n    iex> Time.to_string(~T[23:00:00])\n    "23:00:00"\n    iex> Time.to_string(~T[23:00:00.001])\n    "23:00:00.001"\n    iex> Time.to_string(~T[23:00:00.123456])\n    "23:00:00.123456"\n\n    iex> Time.to_string(~N[2015-01-01 23:00:00.001])\n    "23:00:00.001"\n    iex> Time.to_string(~N[2015-01-01 23:00:00.123456])\n    "23:00:00.123456"\n\n',
    },
    {
      name: "to_seconds_after_midnight/1",
      type: "function",
      specs: [
        "@spec to_seconds_after_midnight(Calendar.time()) ::\n        {integer(), non_neg_integer()}",
      ],
      documentation:
        "Converts a `Time` struct to a number of seconds after midnight.\n\nThe returned value is a two-element tuple with the number of seconds and microseconds.\n\n## Examples\n\n    iex> Time.to_seconds_after_midnight(~T[23:30:15])\n    {84615, 0}\n    iex> Time.to_seconds_after_midnight(~N[2010-04-17 23:30:15.999])\n    {84615, 999000}\n\n",
    },
    {
      name: "to_iso8601/2",
      type: "function",
      specs: [
        "@spec to_iso8601(Calendar.time(), :extended | :basic) :: String.t()",
      ],
      documentation:
        'Converts the given time to\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nBy default, `Time.to_iso8601/2` returns times formatted in the "extended"\nformat, for human readability. It also supports the "basic" format through\npassing the `:basic` option.\n\n### Examples\n\n    iex> Time.to_iso8601(~T[23:00:13])\n    "23:00:13"\n\n    iex> Time.to_iso8601(~T[23:00:13.001])\n    "23:00:13.001"\n\n    iex> Time.to_iso8601(~T[23:00:13.001], :basic)\n    "230013.001"\n\n    iex> Time.to_iso8601(~N[2010-04-17 23:00:13])\n    "23:00:13"\n\n',
    },
    {
      name: "to_erl/1",
      type: "function",
      specs: ["@spec to_erl(Calendar.time()) :: :calendar.time()"],
      documentation:
        "Converts given `time` to an Erlang time tuple.\n\nWARNING: Loss of precision may occur, as Erlang time tuples\nonly contain hours/minutes/seconds.\n\n## Examples\n\n    iex> Time.to_erl(~T[23:30:15.999])\n    {23, 30, 15}\n\n    iex> Time.to_erl(~N[2010-04-17 23:30:15.999])\n    {23, 30, 15}\n\n",
    },
    {
      name: "shift/2",
      type: "function",
      specs: [
        "@spec shift(Calendar.time(), Duration.t() | [unit_pair]) :: t()\n      when unit_pair:\n             {:hour, integer()}\n             | {:minute, integer()}\n             | {:second, integer()}\n             | {:microsecond, {integer(), 0..6}}",
      ],
      documentation:
        "Shifts given `time` by `duration` according to its calendar.\n\nAvailable duration units are: `:hour`, `:minute`, `:second`, `:microsecond`.\n\nWhen using the default ISO calendar, durations are collapsed to seconds and\nmicroseconds before they are applied.\n\nRaises an `ArgumentError` when called with date scale units.\n\n## Examples\n\n    iex> Time.shift(~T[01:00:15], hour: 12)\n    ~T[13:00:15]\n    iex> Time.shift(~T[01:35:00], hour: 6, minute: -15)\n    ~T[07:20:00]\n    iex> Time.shift(~T[01:15:00], second: 125)\n    ~T[01:17:05]\n    iex> Time.shift(~T[01:00:15], microsecond: {100, 6})\n    ~T[01:00:15.000100]\n    iex> Time.shift(~T[01:15:00], Duration.new!(second: 65))\n    ~T[01:16:05]\n\n",
    },
    {
      name: "new!/5",
      type: "function",
      specs: [
        "@spec new!(\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond() | non_neg_integer(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Builds a new time.\n\nExpects all values to be integers. Returns `time` if each\nentry fits its appropriate range, raises if the time is invalid.\n\nMicroseconds can also be given with a precision, which must be an\ninteger between 0 and 6.\n\nThe built-in calendar does not support leap seconds.\n\n## Examples\n\n    iex> Time.new!(0, 0, 0, 0)\n    ~T[00:00:00.000000]\n    iex> Time.new!(23, 59, 59, 999_999)\n    ~T[23:59:59.999999]\n    iex> Time.new!(24, 59, 59, 999_999)\n    ** (ArgumentError) cannot build time, reason: :invalid_time\n",
    },
    {
      name: "new/5",
      type: "function",
      specs: [
        "@spec new(\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond() | non_neg_integer(),\n        Calendar.calendar()\n      ) :: {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Builds a new time.\n\nExpects all values to be integers. Returns `{:ok, time}` if each\nentry fits its appropriate range, returns `{:error, reason}` otherwise.\n\nMicroseconds can also be given with a precision, which must be an\ninteger between 0 and 6.\n\nThe built-in calendar does not support leap seconds.\n\n## Examples\n\n    iex> Time.new(0, 0, 0, 0)\n    {:ok, ~T[00:00:00.000000]}\n    iex> Time.new(23, 59, 59, 999_999)\n    {:ok, ~T[23:59:59.999999]}\n\n    iex> Time.new(24, 59, 59, 999_999)\n    {:error, :invalid_time}\n    iex> Time.new(23, 60, 59, 999_999)\n    {:error, :invalid_time}\n    iex> Time.new(23, 59, 60, 999_999)\n    {:error, :invalid_time}\n    iex> Time.new(23, 59, 59, 1_000_000)\n    {:error, :invalid_time}\n\n    # Invalid precision\n    Time.new(23, 59, 59, {999_999, 10})\n    {:error, :invalid_time}\n\n",
    },
    {
      name: "from_seconds_after_midnight/3",
      type: "function",
      specs: [
        "@spec from_seconds_after_midnight(\n        integer(),\n        Calendar.microsecond(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Converts a number of seconds after midnight to a `Time` struct.\n\n## Examples\n\n    iex> Time.from_seconds_after_midnight(10_000)\n    ~T[02:46:40]\n    iex> Time.from_seconds_after_midnight(30_000, {5000, 3})\n    ~T[08:20:00.005]\n    iex> Time.from_seconds_after_midnight(-1)\n    ~T[23:59:59]\n    iex> Time.from_seconds_after_midnight(100_000)\n    ~T[03:46:40]\n\n",
    },
    {
      name: "from_iso8601!/2",
      type: "function",
      specs: ["@spec from_iso8601!(String.t(), Calendar.calendar()) :: t()"],
      documentation:
        'Parses the extended "Local time" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nRaises if the format is invalid.\n\n## Examples\n\n    iex> Time.from_iso8601!("23:50:07,123Z")\n    ~T[23:50:07.123]\n    iex> Time.from_iso8601!("23:50:07.123Z")\n    ~T[23:50:07.123]\n    iex> Time.from_iso8601!("2015:01:23 23-50-07")\n    ** (ArgumentError) cannot parse "2015:01:23 23-50-07" as time, reason: :invalid_format\n\n',
    },
    {
      name: "from_iso8601/2",
      type: "function",
      specs: [
        "@spec from_iso8601(String.t(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        'Parses the extended "Local time" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nTime zone offset may be included in the string but they will be\nsimply discarded as such information is not included in times.\n\nAs specified in the standard, the separator "T" may be omitted if\ndesired as there is no ambiguity within this function.\n\n## Examples\n\n    iex> Time.from_iso8601("23:50:07")\n    {:ok, ~T[23:50:07]}\n    iex> Time.from_iso8601("23:50:07Z")\n    {:ok, ~T[23:50:07]}\n    iex> Time.from_iso8601("T23:50:07Z")\n    {:ok, ~T[23:50:07]}\n\n    iex> Time.from_iso8601("23:50:07,0123456")\n    {:ok, ~T[23:50:07.012345]}\n    iex> Time.from_iso8601("23:50:07.0123456")\n    {:ok, ~T[23:50:07.012345]}\n    iex> Time.from_iso8601("23:50:07.123Z")\n    {:ok, ~T[23:50:07.123]}\n\n    iex> Time.from_iso8601("2015:01:23 23-50-07")\n    {:error, :invalid_format}\n    iex> Time.from_iso8601("23:50:07A")\n    {:error, :invalid_format}\n    iex> Time.from_iso8601("23:50:07.")\n    {:error, :invalid_format}\n    iex> Time.from_iso8601("23:50:61")\n    {:error, :invalid_time}\n\n',
    },
    {
      name: "from_erl!/3",
      type: "function",
      specs: [
        "@spec from_erl!(:calendar.time(), Calendar.microsecond(), Calendar.calendar()) ::\n        t()",
      ],
      documentation:
        "Converts an Erlang time tuple to a `Time` struct.\n\n## Examples\n\n    iex> Time.from_erl!({23, 30, 15})\n    ~T[23:30:15]\n    iex> Time.from_erl!({23, 30, 15}, {5000, 3})\n    ~T[23:30:15.005]\n    iex> Time.from_erl!({24, 30, 15})\n    ** (ArgumentError) cannot convert {24, 30, 15} to time, reason: :invalid_time\n\n",
    },
    {
      name: "from_erl/3",
      type: "function",
      specs: [
        "@spec from_erl(:calendar.time(), Calendar.microsecond(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Converts an Erlang time tuple to a `Time` struct.\n\n## Examples\n\n    iex> Time.from_erl({23, 30, 15}, {5000, 3})\n    {:ok, ~T[23:30:15.005]}\n    iex> Time.from_erl({24, 30, 15})\n    {:error, :invalid_time}\n\n",
    },
    {
      name: "diff/3",
      type: "function",
      specs: [
        "@spec diff(\n        Calendar.time(),\n        Calendar.time(),\n        :hour | :minute | System.time_unit()\n      ) :: integer()",
      ],
      documentation:
        "Returns the difference between two times, considering only the hour, minute,\nsecond and microsecond.\n\nAs with the `compare/2` function both `Time` structs and other structures\ncontaining time can be used. If for instance a `NaiveDateTime` or `DateTime`\nis passed, only the hour, minute, second, and microsecond is considered. Any\nadditional information about a date or time zone is ignored when calculating\nthe difference.\n\nThe answer can be returned in any `:hour`, `:minute`, `:second` or any\nsubsecond `unit` available from `t:System.time_unit/0`. If the first time\nvalue is earlier than the second, a negative number is returned.\n\nThe unit is measured according to `Calendar.ISO` and defaults to `:second`.\nFractional results are not supported and are truncated.\n\n## Examples\n\n    iex> Time.diff(~T[00:29:12], ~T[00:29:10])\n    2\n\n    # When passing a `NaiveDateTime` the date part is ignored.\n    iex> Time.diff(~N[2017-01-01 00:29:12], ~T[00:29:10])\n    2\n\n    # Two `NaiveDateTime` structs could have big differences in the date\n    # but only the time part is considered.\n    iex> Time.diff(~N[2017-01-01 00:29:12], ~N[1900-02-03 00:29:10])\n    2\n\n    iex> Time.diff(~T[00:29:12], ~T[00:29:10], :microsecond)\n    2_000_000\n    iex> Time.diff(~T[00:29:10], ~T[00:29:12], :microsecond)\n    -2_000_000\n\n    iex> Time.diff(~T[02:29:10], ~T[00:29:10], :hour)\n    2\n    iex> Time.diff(~T[02:29:10], ~T[00:29:11], :hour)\n    1\n\n",
    },
    {
      name: "convert!/2",
      type: "function",
      specs: ["@spec convert!(Calendar.time(), Calendar.calendar()) :: t()"],
      documentation:
        "Similar to `Time.convert/2`, but raises an `ArgumentError`\nif the conversion between the two calendars is not possible.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> Time.convert!(~T[13:30:15], Calendar.Holocene)\n    %Time{calendar: Calendar.Holocene, hour: 13, minute: 30, second: 15, microsecond: {0, 0}}\n\n",
    },
    {
      name: "convert/2",
      type: "function",
      specs: [
        "@spec convert(Calendar.time(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Converts given `time` to a different calendar.\n\nReturns `{:ok, time}` if the conversion was successful,\nor `{:error, reason}` if it was not, for some reason.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> Time.convert(~T[13:30:15], Calendar.Holocene)\n    {:ok, %Time{calendar: Calendar.Holocene, hour: 13, minute: 30, second: 15, microsecond: {0, 0}}}\n\n",
    },
    {
      name: "compare/2",
      type: "function",
      specs: [
        "@spec compare(Calendar.time(), Calendar.time()) :: :lt | :eq | :gt",
      ],
      documentation:
        "Compares two time structs.\n\nReturns `:gt` if first time is later than the second\nand `:lt` for vice versa. If the two times are equal\n`:eq` is returned.\n\n## Examples\n\n    iex> Time.compare(~T[16:04:16], ~T[16:04:28])\n    :lt\n    iex> Time.compare(~T[16:04:16], ~T[16:04:16])\n    :eq\n    iex> Time.compare(~T[16:04:16.01], ~T[16:04:16.001])\n    :gt\n\nThis function can also be used to compare across more\ncomplex calendar types by considering only the time fields:\n\n    iex> Time.compare(~N[1900-01-01 16:04:16], ~N[2015-01-01 16:04:16])\n    :eq\n    iex> Time.compare(~N[2015-01-01 16:04:16], ~N[2015-01-01 16:04:28])\n    :lt\n    iex> Time.compare(~N[2015-01-01 16:04:16.01], ~N[2000-01-01 16:04:16.001])\n    :gt\n\n",
    },
    {
      name: "before?/2",
      type: "function",
      specs: ["@spec before?(Calendar.time(), Calendar.time()) :: boolean()"],
      documentation:
        "Returns `true` if the first time is strictly earlier than the second.\n\n## Examples\n\n    iex> Time.before?(~T[16:04:16], ~T[16:04:28])\n    true\n    iex> Time.before?(~T[16:04:16], ~T[16:04:16])\n    false\n    iex> Time.before?(~T[16:04:16.01], ~T[16:04:16.001])\n    false\n\n",
    },
    {
      name: "after?/2",
      type: "function",
      specs: ["@spec after?(Calendar.time(), Calendar.time()) :: boolean()"],
      documentation:
        "Returns `true` if the first time is strictly later than the second.\n\n## Examples\n\n    iex> Time.after?(~T[16:04:28], ~T[16:04:16])\n    true\n    iex> Time.after?(~T[16:04:16], ~T[16:04:16])\n    false\n    iex> Time.after?(~T[16:04:16.001], ~T[16:04:16.01])\n    false\n\n",
    },
    {
      name: "add/3",
      type: "function",
      specs: [
        "@spec add(Calendar.time(), integer(), :hour | :minute | System.time_unit()) ::\n        t()",
      ],
      documentation:
        "Adds the `amount_to_add` of `unit`s to the given `time`.\n\nAccepts an `amount_to_add` in any `unit`. `unit` can be\n`:hour`, `:minute`, `:second` or any subsecond precision from\n`t:System.time_unit/0`. It defaults to `:second`. Negative values\nwill move backwards in time.\n\nThis function always consider the unit to be computed according\nto the `Calendar.ISO`.\n\nNote the result value represents the time of day, meaning that it is cyclic,\nfor instance, it will never go over 24 hours for the ISO calendar.\n\n## Examples\n\n    iex> Time.add(~T[10:00:00], 27000)\n    ~T[17:30:00]\n    iex> Time.add(~T[11:00:00.005], 2400)\n    ~T[11:40:00.005]\n    iex> Time.add(~T[00:00:00.000], 86_399_999, :millisecond)\n    ~T[23:59:59.999]\n\nNegative values are allowed:\n\n    iex> Time.add(~T[23:00:00], -60)\n    ~T[22:59:00]\n\nNote that the time is cyclic:\n\n    iex> Time.add(~T[17:10:05], 86400)\n    ~T[17:10:05]\n\nHours and minutes are also supported:\n\n    iex> Time.add(~T[17:10:05], 2, :hour)\n    ~T[19:10:05]\n    iex> Time.add(~T[17:10:05], 30, :minute)\n    ~T[17:40:05]\n\nThis operation merges the precision of the time with the given unit:\n\n    iex> result = Time.add(~T[00:29:10], 21, :millisecond)\n    ~T[00:29:10.021]\n    iex> result.microsecond\n    {21000, 3}\n\nTo shift a time by a `Duration` and according to its underlying calendar, use `Time.shift/2`.\n\n",
    },
  ],
  name: "Time",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Time{\n        calendar: Calendar.calendar(),\n        hour: Calendar.hour(),\n        microsecond: Calendar.microsecond(),\n        minute: Calendar.minute(),\n        second: Calendar.second()\n      }",
      ],
      documentation: null,
    },
  ],
};
