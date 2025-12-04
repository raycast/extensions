import type { ModuleDoc } from "../types";

export const NaiveDateTime: ModuleDoc = {
  functions: [
    {
      name: "utc_now/2",
      type: "function",
      specs: [
        "@spec utc_now(\n        :native | :microsecond | :millisecond | :second,\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Returns the current naive datetime in UTC, supporting a specific\ncalendar and precision.\n\nPrefer using `DateTime.utc_now/2` when possible as, opposite\nto `NaiveDateTime`, it will keep the time zone information.\n\n## Examples\n\n    iex> naive_datetime = NaiveDateTime.utc_now(:second, Calendar.ISO)\n    iex> naive_datetime.year >= 2016\n    true\n\n    iex> naive_datetime = NaiveDateTime.utc_now(:second, Calendar.ISO)\n    iex> naive_datetime.microsecond\n    {0, 0}\n\n",
    },
    {
      name: "utc_now/1",
      type: "function",
      specs: [
        "@spec utc_now(\n        Calendar.calendar()\n        | :native\n        | :microsecond\n        | :millisecond\n        | :second\n      ) :: t()",
      ],
      documentation:
        "Returns the current naive datetime in UTC.\n\nPrefer using `DateTime.utc_now/0` when possible as, opposite\nto `NaiveDateTime`, it will keep the time zone information.\n\nYou can also provide a time unit to automatically truncate\nthe naive datetime. This is available since v1.15.0.\n\n## Examples\n\n    iex> naive_datetime = NaiveDateTime.utc_now()\n    iex> naive_datetime.year >= 2016\n    true\n\n    iex> naive_datetime = NaiveDateTime.utc_now(:second)\n    iex> naive_datetime.microsecond\n    {0, 0}\n\n",
    },
    {
      name: "truncate/2",
      type: "function",
      specs: [
        "@spec truncate(t(), :microsecond | :millisecond | :second) :: t()",
      ],
      documentation:
        "Returns the given naive datetime with the microsecond field truncated to the\ngiven precision (`:microsecond`, `:millisecond` or `:second`).\n\nThe given naive datetime is returned unchanged if it already has lower precision\nthan the given precision.\n\n## Examples\n\n    iex> NaiveDateTime.truncate(~N[2017-11-06 00:23:51.123456], :microsecond)\n    ~N[2017-11-06 00:23:51.123456]\n\n    iex> NaiveDateTime.truncate(~N[2017-11-06 00:23:51.123456], :millisecond)\n    ~N[2017-11-06 00:23:51.123]\n\n    iex> NaiveDateTime.truncate(~N[2017-11-06 00:23:51.123456], :second)\n    ~N[2017-11-06 00:23:51]\n\n",
    },
    {
      name: "to_time/1",
      type: "function",
      specs: ["@spec to_time(Calendar.naive_datetime()) :: Time.t()"],
      documentation:
        "Converts a `NaiveDateTime` into `Time`.\n\nBecause `Time` does not hold date information,\ndata will be lost during the conversion.\n\n## Examples\n\n    iex> NaiveDateTime.to_time(~N[2002-01-13 23:00:07])\n    ~T[23:00:07]\n\n",
    },
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(Calendar.naive_datetime()) :: String.t()"],
      documentation:
        'Converts the given naive datetime to a string according to its calendar.\n\n### Examples\n\n    iex> NaiveDateTime.to_string(~N[2000-02-28 23:00:13])\n    "2000-02-28 23:00:13"\n    iex> NaiveDateTime.to_string(~N[2000-02-28 23:00:13.001])\n    "2000-02-28 23:00:13.001"\n    iex> NaiveDateTime.to_string(~N[-0100-12-15 03:20:31])\n    "-0100-12-15 03:20:31"\n\nThis function can also be used to convert a DateTime to a string without\nthe time zone information:\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> NaiveDateTime.to_string(dt)\n    "2000-02-29 23:00:07"\n\n',
    },
    {
      name: "to_iso8601/2",
      type: "function",
      specs: [
        "@spec to_iso8601(Calendar.naive_datetime(), :basic | :extended) :: String.t()",
      ],
      documentation:
        'Converts the given naive datetime to\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nBy default, `NaiveDateTime.to_iso8601/2` returns naive datetimes formatted in the "extended"\nformat, for human readability. It also supports the "basic" format through passing the `:basic` option.\n\nOnly supports converting naive datetimes which are in the ISO calendar,\nattempting to convert naive datetimes from other calendars will raise.\n\n### Examples\n\n    iex> NaiveDateTime.to_iso8601(~N[2000-02-28 23:00:13])\n    "2000-02-28T23:00:13"\n\n    iex> NaiveDateTime.to_iso8601(~N[2000-02-28 23:00:13.001])\n    "2000-02-28T23:00:13.001"\n\n    iex> NaiveDateTime.to_iso8601(~N[2000-02-28 23:00:13.001], :basic)\n    "20000228T230013.001"\n\nThis function can also be used to convert a DateTime to ISO 8601 without\nthe time zone information:\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> NaiveDateTime.to_iso8601(dt)\n    "2000-02-29T23:00:07"\n\n',
    },
    {
      name: "to_gregorian_seconds/1",
      type: "function",
      specs: [
        "@spec to_gregorian_seconds(Calendar.naive_datetime()) ::\n        {integer(), non_neg_integer()}",
      ],
      documentation:
        "Converts a `NaiveDateTime` struct to a number of gregorian seconds and microseconds.\n\n## Examples\n\n    iex> NaiveDateTime.to_gregorian_seconds(~N[0000-01-01 00:00:01])\n    {1, 0}\n    iex> NaiveDateTime.to_gregorian_seconds(~N[2020-05-01 00:26:31.005])\n    {63_755_511_991, 5000}\n\n",
    },
    {
      name: "to_erl/1",
      type: "function",
      specs: [
        "@spec to_erl(Calendar.naive_datetime()) :: :calendar.datetime()",
      ],
      documentation:
        'Converts a `NaiveDateTime` struct to an Erlang datetime tuple.\n\nOnly supports converting naive datetimes which are in the ISO calendar,\nattempting to convert naive datetimes from other calendars will raise.\n\nWARNING: Loss of precision may occur, as Erlang time tuples only store\nhour/minute/second.\n\n## Examples\n\n    iex> NaiveDateTime.to_erl(~N[2000-01-01 13:30:15])\n    {{2000, 1, 1}, {13, 30, 15}}\n\nThis function can also be used to convert a DateTime to an Erlang\ndatetime tuple without the time zone information:\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> NaiveDateTime.to_erl(dt)\n    {{2000, 2, 29}, {23, 00, 07}}\n\n',
    },
    {
      name: "to_date/1",
      type: "function",
      specs: ["@spec to_date(Calendar.naive_datetime()) :: Date.t()"],
      documentation:
        "Converts a `NaiveDateTime` into a `Date`.\n\nBecause `Date` does not hold time information,\ndata will be lost during the conversion.\n\n## Examples\n\n    iex> NaiveDateTime.to_date(~N[2002-01-13 23:00:07])\n    ~D[2002-01-13]\n\n",
    },
    {
      name: "shift/2",
      type: "function",
      specs: [
        "@spec shift(Calendar.naive_datetime(), Duration.duration()) :: t()",
      ],
      documentation:
        "Shifts given `naive_datetime` by `duration` according to its calendar.\n\nAllowed units are: `:year`, `:month`, `:week`, `:day`, `:hour`, `:minute`, `:second`, `:microsecond`.\n\nWhen using the default ISO calendar, durations are collapsed and\napplied in the order of months, then seconds and microseconds:\n\n* when shifting by 1 year and 2 months the date is actually shifted by 14 months\n* weeks, days and smaller units are collapsed into seconds and microseconds\n\nWhen shifting by month, days are rounded down to the nearest valid date.\n\n## Examples\n\n    iex> NaiveDateTime.shift(~N[2016-01-31 00:00:00], month: 1)\n    ~N[2016-02-29 00:00:00]\n    iex> NaiveDateTime.shift(~N[2016-01-31 00:00:00], year: 4, day: 1)\n    ~N[2020-02-01 00:00:00]\n    iex> NaiveDateTime.shift(~N[2016-01-31 00:00:00], year: -2, day: 1)\n    ~N[2014-02-01 00:00:00]\n    iex> NaiveDateTime.shift(~N[2016-01-31 00:00:00], second: 45)\n    ~N[2016-01-31 00:00:45]\n    iex> NaiveDateTime.shift(~N[2016-01-31 00:00:00], microsecond: {100, 6})\n    ~N[2016-01-31 00:00:00.000100]\n\n    # leap years\n    iex> NaiveDateTime.shift(~N[2024-02-29 00:00:00], year: 1)\n    ~N[2025-02-28 00:00:00]\n    iex> NaiveDateTime.shift(~N[2024-02-29 00:00:00], year: 4)\n    ~N[2028-02-29 00:00:00]\n\n    # rounding down\n    iex> NaiveDateTime.shift(~N[2015-01-31 00:00:00], month: 1)\n    ~N[2015-02-28 00:00:00]\n\n",
    },
    {
      name: "new!/8",
      type: "function",
      specs: [
        "@spec new!(\n        Calendar.year(),\n        Calendar.month(),\n        Calendar.day(),\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond() | non_neg_integer(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Builds a new ISO naive datetime.\n\nExpects all values to be integers. Returns `naive_datetime`\nif each entry fits its appropriate range, raises if\ntime or date is invalid.\n\n## Examples\n\n    iex> NaiveDateTime.new!(2000, 1, 1, 0, 0, 0)\n    ~N[2000-01-01 00:00:00]\n    iex> NaiveDateTime.new!(2000, 2, 29, 0, 0, 0)\n    ~N[2000-02-29 00:00:00]\n    iex> NaiveDateTime.new!(2000, 1, 1, 23, 59, 59, {0, 1})\n    ~N[2000-01-01 23:59:59.0]\n    iex> NaiveDateTime.new!(2000, 1, 1, 23, 59, 59, 999_999)\n    ~N[2000-01-01 23:59:59.999999]\n    iex> NaiveDateTime.new!(2000, 1, 1, 23, 59, 59, {0, 1}, Calendar.ISO)\n    ~N[2000-01-01 23:59:59.0]\n    iex> NaiveDateTime.new!(2000, 1, 1, 24, 59, 59, 999_999)\n    ** (ArgumentError) cannot build naive datetime, reason: :invalid_time\n\n",
    },
    {
      name: "new!/2",
      type: "function",
      specs: ["@spec new!(Date.t(), Time.t()) :: t()"],
      documentation:
        "Builds a naive datetime from date and time structs.\n\n## Examples\n\n    iex> NaiveDateTime.new!(~D[2010-01-13], ~T[23:00:07.005])\n    ~N[2010-01-13 23:00:07.005]\n\n",
    },
    {
      name: "new/8",
      type: "function",
      specs: [
        "@spec new(\n        Calendar.year(),\n        Calendar.month(),\n        Calendar.day(),\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond() | non_neg_integer(),\n        Calendar.calendar()\n      ) :: {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Builds a new ISO naive datetime.\n\nExpects all values to be integers. Returns `{:ok, naive_datetime}`\nif each entry fits its appropriate range, returns `{:error, reason}`\notherwise.\n\n## Examples\n\n    iex> NaiveDateTime.new(2000, 1, 1, 0, 0, 0)\n    {:ok, ~N[2000-01-01 00:00:00]}\n    iex> NaiveDateTime.new(2000, 13, 1, 0, 0, 0)\n    {:error, :invalid_date}\n    iex> NaiveDateTime.new(2000, 2, 29, 0, 0, 0)\n    {:ok, ~N[2000-02-29 00:00:00]}\n    iex> NaiveDateTime.new(2000, 2, 30, 0, 0, 0)\n    {:error, :invalid_date}\n    iex> NaiveDateTime.new(2001, 2, 29, 0, 0, 0)\n    {:error, :invalid_date}\n\n    iex> NaiveDateTime.new(2000, 1, 1, 23, 59, 59, {0, 1})\n    {:ok, ~N[2000-01-01 23:59:59.0]}\n    iex> NaiveDateTime.new(2000, 1, 1, 23, 59, 59, 999_999)\n    {:ok, ~N[2000-01-01 23:59:59.999999]}\n    iex> NaiveDateTime.new(2000, 1, 1, 24, 59, 59, 999_999)\n    {:error, :invalid_time}\n    iex> NaiveDateTime.new(2000, 1, 1, 23, 60, 59, 999_999)\n    {:error, :invalid_time}\n    iex> NaiveDateTime.new(2000, 1, 1, 23, 59, 60, 999_999)\n    {:error, :invalid_time}\n    iex> NaiveDateTime.new(2000, 1, 1, 23, 59, 59, 1_000_000)\n    {:error, :invalid_time}\n\n    iex> NaiveDateTime.new(2000, 1, 1, 23, 59, 59, {0, 1}, Calendar.ISO)\n    {:ok, ~N[2000-01-01 23:59:59.0]}\n\n",
    },
    {
      name: "new/2",
      type: "function",
      specs: ["@spec new(Date.t(), Time.t()) :: {:ok, t()}"],
      documentation:
        "Builds a naive datetime from date and time structs.\n\n## Examples\n\n    iex> NaiveDateTime.new(~D[2010-01-13], ~T[23:00:07.005])\n    {:ok, ~N[2010-01-13 23:00:07.005]}\n\n",
    },
    {
      name: "local_now/1",
      type: "function",
      specs: ["@spec local_now(Calendar.calendar()) :: t()"],
      documentation:
        'Returns the "local time" for the machine the Elixir program is running on.\n\nWARNING: This function can cause insidious bugs. It depends on the time zone\nconfiguration at run time. This can changed and be set to a time zone that has\ndaylight saving jumps (spring forward or fall back).\n\nThis function can be used to display what the time is right now for the time\nzone configuration that the machine happens to have. An example would be a\ndesktop program displaying a clock to the user. For any other uses it is\nprobably a bad idea to use this function.\n\nFor most cases, use `DateTime.now/2` or `DateTime.utc_now/1` instead.\n\nDoes not include fractional seconds.\n\n## Examples\n\n    iex> naive_datetime = NaiveDateTime.local_now()\n    iex> naive_datetime.year >= 2019\n    true\n\n',
    },
    {
      name: "from_iso8601!/2",
      type: "function",
      specs: ["@spec from_iso8601!(String.t(), Calendar.calendar()) :: t()"],
      documentation:
        'Parses the extended "Date and time of day" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nRaises if the format is invalid.\n\n## Examples\n\n    iex> NaiveDateTime.from_iso8601!("2015-01-23T23:50:07.123Z")\n    ~N[2015-01-23 23:50:07.123]\n    iex> NaiveDateTime.from_iso8601!("2015-01-23T23:50:07,123Z")\n    ~N[2015-01-23 23:50:07.123]\n    iex> NaiveDateTime.from_iso8601!("2015-01-23P23:50:07")\n    ** (ArgumentError) cannot parse "2015-01-23P23:50:07" as naive datetime, reason: :invalid_format\n\n',
    },
    {
      name: "from_iso8601/2",
      type: "function",
      specs: [
        "@spec from_iso8601(String.t(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        'Parses the extended "Date and time of day" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nTime zone offset may be included in the string but they will be\nsimply discarded as such information is not included in naive date\ntimes.\n\nAs specified in the standard, the separator "T" may be omitted if\ndesired as there is no ambiguity within this function.\n\nNote leap seconds are not supported by the built-in Calendar.ISO.\n\n## Examples\n\n    iex> NaiveDateTime.from_iso8601("2015-01-23 23:50:07")\n    {:ok, ~N[2015-01-23 23:50:07]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07")\n    {:ok, ~N[2015-01-23 23:50:07]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07Z")\n    {:ok, ~N[2015-01-23 23:50:07]}\n\n    iex> NaiveDateTime.from_iso8601("2015-01-23 23:50:07.0")\n    {:ok, ~N[2015-01-23 23:50:07.0]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23 23:50:07,0123456")\n    {:ok, ~N[2015-01-23 23:50:07.012345]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23 23:50:07.0123456")\n    {:ok, ~N[2015-01-23 23:50:07.012345]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123Z")\n    {:ok, ~N[2015-01-23 23:50:07.123]}\n\n    iex> NaiveDateTime.from_iso8601("2015-01-23P23:50:07")\n    {:error, :invalid_format}\n    iex> NaiveDateTime.from_iso8601("2015:01:23 23-50-07")\n    {:error, :invalid_format}\n    iex> NaiveDateTime.from_iso8601("2015-01-23 23:50:07A")\n    {:error, :invalid_format}\n    iex> NaiveDateTime.from_iso8601("2015-01-23 23:50:61")\n    {:error, :invalid_time}\n    iex> NaiveDateTime.from_iso8601("2015-01-32 23:50:07")\n    {:error, :invalid_date}\n\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123+02:30")\n    {:ok, ~N[2015-01-23 23:50:07.123]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123+00:00")\n    {:ok, ~N[2015-01-23 23:50:07.123]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123-02:30")\n    {:ok, ~N[2015-01-23 23:50:07.123]}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123-00:00")\n    {:error, :invalid_format}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123-00:60")\n    {:error, :invalid_format}\n    iex> NaiveDateTime.from_iso8601("2015-01-23T23:50:07.123-24:00")\n    {:error, :invalid_format}\n\n',
    },
    {
      name: "from_gregorian_seconds/3",
      type: "function",
      specs: [
        "@spec from_gregorian_seconds(\n        integer(),\n        Calendar.microsecond(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Converts a number of gregorian seconds to a `NaiveDateTime` struct.\n\n## Examples\n\n    iex> NaiveDateTime.from_gregorian_seconds(1)\n    ~N[0000-01-01 00:00:01]\n    iex> NaiveDateTime.from_gregorian_seconds(63_755_511_991, {5000, 3})\n    ~N[2020-05-01 00:26:31.005]\n    iex> NaiveDateTime.from_gregorian_seconds(-1)\n    ~N[-0001-12-31 23:59:59]\n\n",
    },
    {
      name: "from_erl!/3",
      type: "function",
      specs: [
        "@spec from_erl!(\n        :calendar.datetime(),\n        Calendar.microsecond(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Converts an Erlang datetime tuple to a `NaiveDateTime` struct.\n\nRaises if the datetime is invalid.\nAttempting to convert an invalid ISO calendar date will produce an error tuple.\n\n## Examples\n\n    iex> NaiveDateTime.from_erl!({{2000, 1, 1}, {13, 30, 15}})\n    ~N[2000-01-01 13:30:15]\n    iex> NaiveDateTime.from_erl!({{2000, 1, 1}, {13, 30, 15}}, {5000, 3})\n    ~N[2000-01-01 13:30:15.005]\n    iex> NaiveDateTime.from_erl!({{2000, 13, 1}, {13, 30, 15}})\n    ** (ArgumentError) cannot convert {{2000, 13, 1}, {13, 30, 15}} to naive datetime, reason: :invalid_date\n\n",
    },
    {
      name: "from_erl/3",
      type: "function",
      specs: [
        "@spec from_erl(\n        :calendar.datetime(),\n        Calendar.microsecond(),\n        Calendar.calendar()\n      ) :: {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Converts an Erlang datetime tuple to a `NaiveDateTime` struct.\n\nAttempting to convert an invalid ISO calendar date will produce an error tuple.\n\n## Examples\n\n    iex> NaiveDateTime.from_erl({{2000, 1, 1}, {13, 30, 15}})\n    {:ok, ~N[2000-01-01 13:30:15]}\n    iex> NaiveDateTime.from_erl({{2000, 1, 1}, {13, 30, 15}}, {5000, 3})\n    {:ok, ~N[2000-01-01 13:30:15.005]}\n    iex> NaiveDateTime.from_erl({{2000, 13, 1}, {13, 30, 15}})\n    {:error, :invalid_date}\n    iex> NaiveDateTime.from_erl({{2000, 13, 1}, {13, 30, 15}})\n    {:error, :invalid_date}\n\n",
    },
    {
      name: "end_of_day/1",
      type: "function",
      specs: ["@spec end_of_day(Calendar.naive_datetime()) :: t()"],
      documentation:
        "Calculates a `NaiveDateTime` that is the last moment for the given `NaiveDateTime`.\n\nTo calculate the end of day of a `DateTime`, call this function, then convert back to a `DateTime`:\n\n    datetime\n    |> NaiveDateTime.end_of_day()\n    |> DateTime.from_naive(datetime.time_zone)\n\nNote that the end of the day may not exist or be ambiguous\nin a given timezone, so you must handle those cases accordingly.\n\n## Examples\n\n    iex> NaiveDateTime.end_of_day(~N[2000-01-01 23:00:07.123456])\n    ~N[2000-01-01 23:59:59.999999]\n\n",
    },
    {
      name: "diff/3",
      type: "function",
      specs: [
        "@spec diff(\n        Calendar.naive_datetime(),\n        Calendar.naive_datetime(),\n        :day | :hour | :minute | System.time_unit()\n      ) :: integer()",
      ],
      documentation:
        "Subtracts `naive_datetime2` from `naive_datetime1`.\n\nThe answer can be returned in any `:day`, `:hour`, `:minute`, or any `unit`\navailable from `t:System.time_unit/0`. The unit is measured according to\n`Calendar.ISO` and defaults to `:second`.\n\nFractional results are not supported and are truncated.\n\n## Examples\n\n    iex> NaiveDateTime.diff(~N[2014-10-02 00:29:12], ~N[2014-10-02 00:29:10])\n    2\n    iex> NaiveDateTime.diff(~N[2014-10-02 00:29:12], ~N[2014-10-02 00:29:10], :microsecond)\n    2_000_000\n\n    iex> NaiveDateTime.diff(~N[2014-10-02 00:29:10.042], ~N[2014-10-02 00:29:10.021])\n    0\n    iex> NaiveDateTime.diff(~N[2014-10-02 00:29:10.042], ~N[2014-10-02 00:29:10.021], :millisecond)\n    21\n\n    iex> NaiveDateTime.diff(~N[2014-10-02 00:29:10], ~N[2014-10-02 00:29:12])\n    -2\n    iex> NaiveDateTime.diff(~N[-0001-10-02 00:29:10], ~N[-0001-10-02 00:29:12])\n    -2\n\nIt can also compute the difference in days, hours, or minutes:\n\n    iex> NaiveDateTime.diff(~N[2014-10-10 00:29:10], ~N[2014-10-02 00:29:10], :day)\n    8\n    iex> NaiveDateTime.diff(~N[2014-10-02 12:29:10], ~N[2014-10-02 00:29:10], :hour)\n    12\n    iex> NaiveDateTime.diff(~N[2014-10-02 00:39:10], ~N[2014-10-02 00:29:10], :minute)\n    10\n\nBut it also rounds incomplete days to zero:\n\n    iex> NaiveDateTime.diff(~N[2014-10-10 00:29:09], ~N[2014-10-02 00:29:10], :day)\n    7\n\n",
    },
    {
      name: "convert!/2",
      type: "function",
      specs: [
        "@spec convert!(Calendar.naive_datetime(), Calendar.calendar()) :: t()",
      ],
      documentation:
        "Converts the given `naive_datetime` from one calendar to another.\n\nIf it is not possible to convert unambiguously between the calendars\n(see `Calendar.compatible_calendars?/2`), an ArgumentError is raised.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> NaiveDateTime.convert!(~N[2000-01-01 13:30:15], Calendar.Holocene)\n    %NaiveDateTime{calendar: Calendar.Holocene, year: 12000, month: 1, day: 1,\n                   hour: 13, minute: 30, second: 15, microsecond: {0, 0}}\n\n",
    },
    {
      name: "convert/2",
      type: "function",
      specs: [
        "@spec convert(Calendar.naive_datetime(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, :incompatible_calendars}",
      ],
      documentation:
        "Converts the given `naive_datetime` from one calendar to another.\n\nIf it is not possible to convert unambiguously between the calendars\n(see `Calendar.compatible_calendars?/2`), an `{:error, :incompatible_calendars}` tuple\nis returned.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> NaiveDateTime.convert(~N[2000-01-01 13:30:15], Calendar.Holocene)\n    {:ok, %NaiveDateTime{calendar: Calendar.Holocene, year: 12000, month: 1, day: 1,\n                         hour: 13, minute: 30, second: 15, microsecond: {0, 0}}}\n\n",
    },
    {
      name: "compare/2",
      type: "function",
      specs: [
        "@spec compare(Calendar.naive_datetime(), Calendar.naive_datetime()) ::\n        :lt | :eq | :gt",
      ],
      documentation:
        'Compares two `NaiveDateTime` structs.\n\nReturns `:gt` if first is later than the second\nand `:lt` for vice versa. If the two NaiveDateTime\nare equal `:eq` is returned.\n\n## Examples\n\n    iex> NaiveDateTime.compare(~N[2016-04-16 13:30:15], ~N[2016-04-28 16:19:25])\n    :lt\n    iex> NaiveDateTime.compare(~N[2016-04-16 13:30:15.1], ~N[2016-04-16 13:30:15.01])\n    :gt\n\nThis function can also be used to compare a DateTime without\nthe time zone information:\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> NaiveDateTime.compare(dt, ~N[2000-02-29 23:00:07])\n    :eq\n    iex> NaiveDateTime.compare(dt, ~N[2000-01-29 23:00:07])\n    :gt\n    iex> NaiveDateTime.compare(dt, ~N[2000-03-29 23:00:07])\n    :lt\n\n',
    },
    {
      name: "beginning_of_day/1",
      type: "function",
      specs: ["@spec beginning_of_day(Calendar.naive_datetime()) :: t()"],
      documentation:
        "Calculates a `NaiveDateTime` that is the first moment for the given `NaiveDateTime`.\n\nTo calculate the beginning of day of a `DateTime`, call this function, then convert back to a `DateTime`:\n\n    datetime\n    |> NaiveDateTime.beginning_of_day()\n    |> DateTime.from_naive(datetime.time_zone)\n\nNote that the beginning of the day may not exist or be ambiguous\nin a given timezone, so you must handle those cases accordingly.\n\n## Examples\n\n    iex> NaiveDateTime.beginning_of_day(~N[2000-01-01 23:00:07.123456])\n    ~N[2000-01-01 00:00:00.000000]\n\n",
    },
    {
      name: "before?/2",
      type: "function",
      specs: [
        "@spec before?(Calendar.naive_datetime(), Calendar.naive_datetime()) :: boolean()",
      ],
      documentation:
        "Returns `true` if the first `NaiveDateTime` is strictly earlier than the second.\n\n## Examples\n\n    iex> NaiveDateTime.before?(~N[2021-01-01 11:00:00], ~N[2022-02-02 11:00:00])\n    true\n    iex> NaiveDateTime.before?(~N[2021-01-01 11:00:00], ~N[2021-01-01 11:00:00])\n    false\n    iex> NaiveDateTime.before?(~N[2022-02-02 11:00:00], ~N[2021-01-01 11:00:00])\n    false\n\n",
    },
    {
      name: "after?/2",
      type: "function",
      specs: [
        "@spec after?(Calendar.naive_datetime(), Calendar.naive_datetime()) :: boolean()",
      ],
      documentation:
        "Returns `true` if the first `NaiveDateTime` is strictly later than the second.\n\n## Examples\n\n    iex> NaiveDateTime.after?(~N[2022-02-02 11:00:00], ~N[2021-01-01 11:00:00])\n    true\n    iex> NaiveDateTime.after?(~N[2021-01-01 11:00:00], ~N[2021-01-01 11:00:00])\n    false\n    iex> NaiveDateTime.after?(~N[2021-01-01 11:00:00], ~N[2022-02-02 11:00:00])\n    false\n\n",
    },
    {
      name: "add/3",
      type: "function",
      specs: [
        "@spec add(\n        Calendar.naive_datetime(),\n        integer(),\n        :day | :hour | :minute | System.time_unit()\n      ) :: t()",
      ],
      documentation:
        'Adds a specified amount of time to a `NaiveDateTime`.\n\nAccepts an `amount_to_add` in any `unit`. `unit` can be `:day`,\n`:hour`, `:minute`, `:second` or any subsecond precision from\n`t:System.time_unit/0`. It defaults to `:second`. Negative values\nwill move backwards in time.\n\nThis function always consider the unit to be computed according\nto the `Calendar.ISO`.\n\n## Examples\n\nIt uses seconds by default:\n\n    # adds seconds by default\n    iex> NaiveDateTime.add(~N[2014-10-02 00:29:10], 2)\n    ~N[2014-10-02 00:29:12]\n\n    # accepts negative offsets\n    iex> NaiveDateTime.add(~N[2014-10-02 00:29:10], -2)\n    ~N[2014-10-02 00:29:08]\n\nIt can also work with subsecond precisions:\n\n    iex> NaiveDateTime.add(~N[2014-10-02 00:29:10], 2_000, :millisecond)\n    ~N[2014-10-02 00:29:12.000]\n\nAs well as days/hours/minutes:\n\n    iex> NaiveDateTime.add(~N[2015-02-28 00:29:10], 2, :day)\n    ~N[2015-03-02 00:29:10]\n    iex> NaiveDateTime.add(~N[2015-02-28 00:29:10], 36, :hour)\n    ~N[2015-03-01 12:29:10]\n    iex> NaiveDateTime.add(~N[2015-02-28 00:29:10], 60, :minute)\n    ~N[2015-02-28 01:29:10]\n\nThis operation merges the precision of the naive date time with the given unit:\n\n    iex> result = NaiveDateTime.add(~N[2014-10-02 00:29:10], 21, :millisecond)\n    ~N[2014-10-02 00:29:10.021]\n    iex> result.microsecond\n    {21000, 3}\n\nOperations on top of gregorian seconds or the Unix epoch are optimized:\n\n    # from Gregorian seconds\n    iex> NaiveDateTime.add(~N[0000-01-01 00:00:00], 63_579_428_950)\n    ~N[2014-10-02 00:29:10]\n\nPassing a `DateTime` automatically converts it to `NaiveDateTime`,\ndiscarding the time zone information:\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> NaiveDateTime.add(dt, 21, :second)\n    ~N[2000-02-29 23:00:28]\n\nTo shift a naive datetime by a `Duration` and according to its underlying calendar, use `NaiveDateTime.shift/2`.\n\n',
    },
  ],
  name: "NaiveDateTime",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %NaiveDateTime{\n        calendar: Calendar.calendar(),\n        day: Calendar.day(),\n        hour: Calendar.hour(),\n        microsecond: Calendar.microsecond(),\n        minute: Calendar.minute(),\n        month: Calendar.month(),\n        second: Calendar.second(),\n        year: Calendar.year()\n      }",
      ],
      documentation: null,
    },
  ],
};
