import type { ModuleDoc } from "../types";

export const Date: ModuleDoc = {
  functions: [
    {
      name: "year_of_era/1",
      type: "function",
      specs: [
        "@spec year_of_era(Calendar.date()) :: {Calendar.year(), non_neg_integer()}",
      ],
      documentation:
        "Calculates the year-of-era and era for a given\ncalendar year.\n\nReturns a tuple `{year, era}` representing the\nyear within the era and the era number.\n\n## Examples\n\n    iex> Date.year_of_era(~D[0001-01-01])\n    {1, 1}\n    iex> Date.year_of_era(~D[0000-12-31])\n    {1, 0}\n    iex> Date.year_of_era(~D[-0001-01-01])\n    {2, 0}\n\n",
    },
    {
      name: "utc_today/1",
      type: "function",
      specs: ["@spec utc_today(Calendar.calendar()) :: t()"],
      documentation:
        "Returns the current date in UTC.\n\n## Examples\n\n    iex> date = Date.utc_today()\n    iex> date.year >= 2016\n    true\n\n",
    },
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(Calendar.date()) :: String.t()"],
      documentation:
        'Converts the given date to a string according to its calendar.\n\n### Examples\n\n    iex> Date.to_string(~D[2000-02-28])\n    "2000-02-28"\n    iex> Date.to_string(~N[2000-02-28 01:23:45])\n    "2000-02-28"\n    iex> Date.to_string(~D[-0100-12-15])\n    "-0100-12-15"\n\n',
    },
    {
      name: "to_iso8601/2",
      type: "function",
      specs: [
        "@spec to_iso8601(Calendar.date(), :extended | :basic) :: String.t()",
      ],
      documentation:
        'Converts the given `date` to\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nBy default, `Date.to_iso8601/2` returns dates formatted in the "extended"\nformat, for human readability. It also supports the "basic" format through passing the `:basic` option.\n\nOnly supports converting dates which are in the ISO calendar,\nor other calendars in which the days also start at midnight.\nAttempting to convert dates from other calendars will raise an `ArgumentError`.\n\n### Examples\n\n    iex> Date.to_iso8601(~D[2000-02-28])\n    "2000-02-28"\n\n    iex> Date.to_iso8601(~D[2000-02-28], :basic)\n    "20000228"\n\n    iex> Date.to_iso8601(~N[2000-02-28 00:00:00])\n    "2000-02-28"\n\n',
    },
    {
      name: "to_gregorian_days/1",
      type: "function",
      specs: ["@spec to_gregorian_days(Calendar.date()) :: integer()"],
      documentation:
        "Converts a `date` struct to a number of gregorian days.\n\n## Examples\n\n    iex> Date.to_gregorian_days(~D[0000-01-02])\n    1\n    iex> Date.to_gregorian_days(~D[2000-01-01])\n    730_485\n    iex> Date.to_gregorian_days(~N[2000-01-01 00:00:00])\n    730_485\n\n",
    },
    {
      name: "to_erl/1",
      type: "function",
      specs: ["@spec to_erl(Calendar.date()) :: :calendar.date()"],
      documentation:
        "Converts the given `date` to an Erlang date tuple.\n\nOnly supports converting dates which are in the ISO calendar,\nor other calendars in which the days also start at midnight.\nAttempting to convert dates from other calendars will raise.\n\n## Examples\n\n    iex> Date.to_erl(~D[2000-01-01])\n    {2000, 1, 1}\n\n    iex> Date.to_erl(~N[2000-01-01 00:00:00])\n    {2000, 1, 1}\n\n",
    },
    {
      name: "shift/2",
      type: "function",
      specs: [
        "@spec shift(Calendar.date(), Duration.t() | [unit_pair]) :: t()\n      when unit_pair:\n             {:year, integer()}\n             | {:month, integer()}\n             | {:week, integer()}\n             | {:day, integer()}",
      ],
      documentation:
        "Shifts given `date` by `duration` according to its calendar.\n\nAllowed units are: `:year`, `:month`, `:week`, `:day`.\n\nWhen using the default ISO calendar, durations are collapsed and\napplied in the order of months and then days:\n\n* when shifting by 1 year and 2 months the date is actually shifted by 14 months\n* when shifting by 2 weeks and 3 days the date is shifted by 17 days\n\nWhen shifting by month, days are rounded down to the nearest valid date.\n\nRaises an `ArgumentError` when called with time scale units.\n\n## Examples\n\n    iex> Date.shift(~D[2016-01-03], month: 2)\n    ~D[2016-03-03]\n    iex> Date.shift(~D[2016-01-30], month: -1)\n    ~D[2015-12-30]\n    iex> Date.shift(~D[2016-01-31], year: 4, day: 1)\n    ~D[2020-02-01]\n    iex> Date.shift(~D[2016-01-03], Duration.new!(month: 2))\n    ~D[2016-03-03]\n\n    # leap years\n    iex> Date.shift(~D[2024-02-29], year: 1)\n    ~D[2025-02-28]\n    iex> Date.shift(~D[2024-02-29], year: 4)\n    ~D[2028-02-29]\n\n    # rounding down\n    iex> Date.shift(~D[2015-01-31], month: 1)\n    ~D[2015-02-28]\n\n",
    },
    {
      name: "range/3",
      type: "function",
      specs: [
        "@spec range(\n        Calendar.date(),\n        Calendar.date(),\n        step :: pos_integer() | neg_integer()\n      ) :: Date.Range.t()",
      ],
      documentation:
        "Returns a range of dates with a step.\n\n## Examples\n\n    iex> range = Date.range(~D[2001-01-01], ~D[2002-01-01], 2)\n    iex> range\n    Date.range(~D[2001-01-01], ~D[2002-01-01], 2)\n    iex> Enum.count(range)\n    183\n    iex> ~D[2001-01-03] in range\n    true\n    iex> Enum.take(range, 3)\n    [~D[2001-01-01], ~D[2001-01-03], ~D[2001-01-05]]\n\n",
    },
    {
      name: "range/2",
      type: "function",
      specs: [
        "@spec range(Calendar.date(), Calendar.date()) :: Date.Range.t()",
      ],
      documentation:
        "Returns a range of dates.\n\nA range of dates represents a discrete number of dates where\nthe first and last values are dates with matching calendars.\n\nRanges of dates can be increasing (`first <= last`) and are\nalways inclusive. For a decreasing range, use `range/3` with\na step of -1 as first argument.\n\n## Examples\n\n    iex> Date.range(~D[1999-01-01], ~D[2000-01-01])\n    Date.range(~D[1999-01-01], ~D[2000-01-01])\n\nA range of dates implements the `Enumerable` protocol, which means\nfunctions in the `Enum` module can be used to work with\nranges:\n\n    iex> range = Date.range(~D[2001-01-01], ~D[2002-01-01])\n    iex> range\n    Date.range(~D[2001-01-01], ~D[2002-01-01])\n    iex> Enum.count(range)\n    366\n    iex> ~D[2001-02-01] in range\n    true\n    iex> Enum.take(range, 3)\n    [~D[2001-01-01], ~D[2001-01-02], ~D[2001-01-03]]\n\n",
    },
    {
      name: "quarter_of_year/1",
      type: "function",
      specs: ["@spec quarter_of_year(Calendar.date()) :: non_neg_integer()"],
      documentation:
        "Calculates the quarter of the year of a given `date`.\n\nReturns the day of the year as an integer. For the ISO 8601\ncalendar (the default), it is an integer from 1 to 4.\n\n## Examples\n\n    iex> Date.quarter_of_year(~D[2016-10-31])\n    4\n    iex> Date.quarter_of_year(~D[2016-01-01])\n    1\n    iex> Date.quarter_of_year(~N[2016-04-01 01:23:45])\n    2\n    iex> Date.quarter_of_year(~D[-0015-09-30])\n    3\n\n",
    },
    {
      name: "new!/4",
      type: "function",
      specs: [
        "@spec new!(\n        Calendar.year(),\n        Calendar.month(),\n        Calendar.day(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Builds a new ISO date.\n\nExpects all values to be integers. Returns `date` if each\nentry fits its appropriate range, raises if the date is invalid.\n\n## Examples\n\n    iex> Date.new!(2000, 1, 1)\n    ~D[2000-01-01]\n    iex> Date.new!(2000, 13, 1)\n    ** (ArgumentError) cannot build date, reason: :invalid_date\n    iex> Date.new!(2000, 2, 29)\n    ~D[2000-02-29]\n",
    },
    {
      name: "new/4",
      type: "function",
      specs: [
        "@spec new(\n        Calendar.year(),\n        Calendar.month(),\n        Calendar.day(),\n        Calendar.calendar()\n      ) :: {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Builds a new ISO date.\n\nExpects all values to be integers. Returns `{:ok, date}` if each\nentry fits its appropriate range, returns `{:error, reason}` otherwise.\n\n## Examples\n\n    iex> Date.new(2000, 1, 1)\n    {:ok, ~D[2000-01-01]}\n    iex> Date.new(2000, 13, 1)\n    {:error, :invalid_date}\n    iex> Date.new(2000, 2, 29)\n    {:ok, ~D[2000-02-29]}\n\n    iex> Date.new(2000, 2, 30)\n    {:error, :invalid_date}\n    iex> Date.new(2001, 2, 29)\n    {:error, :invalid_date}\n\n",
    },
    {
      name: "months_in_year/1",
      type: "function",
      specs: ["@spec months_in_year(Calendar.date()) :: Calendar.month()"],
      documentation:
        "Returns the number of months in the given `date` year.\n\n## Example\n\n    iex> Date.months_in_year(~D[1900-01-13])\n    12\n\n",
    },
    {
      name: "leap_year?/1",
      type: "function",
      specs: ["@spec leap_year?(Calendar.date()) :: boolean()"],
      documentation:
        "Returns `true` if the year in the given `date` is a leap year.\n\n## Examples\n\n    iex> Date.leap_year?(~D[2000-01-01])\n    true\n    iex> Date.leap_year?(~D[2001-01-01])\n    false\n    iex> Date.leap_year?(~D[2004-01-01])\n    true\n    iex> Date.leap_year?(~D[1900-01-01])\n    false\n    iex> Date.leap_year?(~N[2004-01-01 01:23:45])\n    true\n\n",
    },
    {
      name: "from_iso8601!/2",
      type: "function",
      specs: ["@spec from_iso8601!(String.t(), Calendar.calendar()) :: t()"],
      documentation:
        'Parses the extended "Dates" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nRaises if the format is invalid.\n\n## Examples\n\n    iex> Date.from_iso8601!("2015-01-23")\n    ~D[2015-01-23]\n    iex> Date.from_iso8601!("2015:01:23")\n    ** (ArgumentError) cannot parse "2015:01:23" as date, reason: :invalid_format\n\n',
    },
    {
      name: "from_iso8601/2",
      type: "function",
      specs: [
        "@spec from_iso8601(String.t(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        'Parses the extended "Dates" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nThe year parsed by this function is limited to four digits.\n\n## Examples\n\n    iex> Date.from_iso8601("2015-01-23")\n    {:ok, ~D[2015-01-23]}\n\n    iex> Date.from_iso8601("2015:01:23")\n    {:error, :invalid_format}\n\n    iex> Date.from_iso8601("2015-01-32")\n    {:error, :invalid_date}\n\n',
    },
    {
      name: "from_gregorian_days/2",
      type: "function",
      specs: [
        "@spec from_gregorian_days(integer(), Calendar.calendar()) :: t()",
      ],
      documentation:
        "Converts a number of gregorian days to a `Date` struct.\n\n## Examples\n\n    iex> Date.from_gregorian_days(1)\n    ~D[0000-01-02]\n    iex> Date.from_gregorian_days(730_485)\n    ~D[2000-01-01]\n    iex> Date.from_gregorian_days(-1)\n    ~D[-0001-12-31]\n\n",
    },
    {
      name: "from_erl!/2",
      type: "function",
      specs: ["@spec from_erl!(:calendar.date(), Calendar.calendar()) :: t()"],
      documentation:
        "Converts an Erlang date tuple but raises for invalid dates.\n\n## Examples\n\n    iex> Date.from_erl!({2000, 1, 1})\n    ~D[2000-01-01]\n    iex> Date.from_erl!({2000, 13, 1})\n    ** (ArgumentError) cannot convert {2000, 13, 1} to date, reason: :invalid_date\n\n",
    },
    {
      name: "from_erl/2",
      type: "function",
      specs: [
        "@spec from_erl(:calendar.date(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Converts an Erlang date tuple to a `Date` struct.\n\nOnly supports converting dates which are in the ISO calendar,\nor other calendars in which the days also start at midnight.\nAttempting to convert dates from other calendars will return an error tuple.\n\n## Examples\n\n    iex> Date.from_erl({2000, 1, 1})\n    {:ok, ~D[2000-01-01]}\n    iex> Date.from_erl({2000, 13, 1})\n    {:error, :invalid_date}\n\n",
    },
    {
      name: "end_of_week/2",
      type: "function",
      specs: [
        "@spec end_of_week(Calendar.date(), starting_on :: :default | atom()) :: t()",
      ],
      documentation:
        "Calculates a date that is the last day of the week for the given `date`.\n\nIf the day is already the last day of the week, it returns the\nday itself. For the built-in ISO calendar, the week ends on Sunday.\nA weekday rather than `:default` can be given as `starting_on`.\n\n## Examples\n\n    iex> Date.end_of_week(~D[2020-07-11])\n    ~D[2020-07-12]\n    iex> Date.end_of_week(~D[2020-07-05])\n    ~D[2020-07-05]\n    iex> Date.end_of_week(~D[2020-07-06], :sunday)\n    ~D[2020-07-11]\n    iex> Date.end_of_week(~D[2020-07-06], :saturday)\n    ~D[2020-07-10]\n    iex> Date.end_of_week(~N[2020-07-11 01:23:45])\n    ~D[2020-07-12]\n\n",
    },
    {
      name: "end_of_month/1",
      type: "function",
      specs: ["@spec end_of_month(Calendar.date()) :: t()"],
      documentation:
        "Calculates a date that is the last day of the month for the given `date`.\n\n## Examples\n\n    iex> Date.end_of_month(~D[2000-01-01])\n    ~D[2000-01-31]\n    iex> Date.end_of_month(~D[2000-01-31])\n    ~D[2000-01-31]\n    iex> Date.end_of_month(~N[2000-01-01 01:23:45])\n    ~D[2000-01-31]\n\n",
    },
    {
      name: "diff/2",
      type: "function",
      specs: ["@spec diff(Calendar.date(), Calendar.date()) :: integer()"],
      documentation:
        "Calculates the difference between two dates, in a full number of days.\n\nIt returns the number of Gregorian days between the dates. Only `Date`\nstructs that follow the same or compatible calendars can be compared\nthis way. If two calendars are not compatible, it will raise.\n\n## Examples\n\n    iex> Date.diff(~D[2000-01-03], ~D[2000-01-01])\n    2\n    iex> Date.diff(~D[2000-01-01], ~D[2000-01-03])\n    -2\n    iex> Date.diff(~D[0000-01-02], ~D[-0001-12-30])\n    3\n    iex> Date.diff(~D[2000-01-01], ~N[2000-01-03 09:00:00])\n    -2\n\n",
    },
    {
      name: "days_in_month/1",
      type: "function",
      specs: ["@spec days_in_month(Calendar.date()) :: Calendar.day()"],
      documentation:
        "Returns the number of days in the given `date` month.\n\n## Examples\n\n    iex> Date.days_in_month(~D[1900-01-13])\n    31\n    iex> Date.days_in_month(~D[1900-02-09])\n    28\n    iex> Date.days_in_month(~N[2000-02-20 01:23:45])\n    29\n\n",
    },
    {
      name: "day_of_year/1",
      type: "function",
      specs: ["@spec day_of_year(Calendar.date()) :: Calendar.day()"],
      documentation:
        "Calculates the day of the year of a given `date`.\n\nReturns the day of the year as an integer. For the ISO 8601\ncalendar (the default), it is an integer from 1 to 366.\n\n## Examples\n\n    iex> Date.day_of_year(~D[2016-01-01])\n    1\n    iex> Date.day_of_year(~D[2016-11-01])\n    306\n    iex> Date.day_of_year(~D[-0015-10-30])\n    303\n    iex> Date.day_of_year(~D[2004-12-31])\n    366\n\n",
    },
    {
      name: "day_of_week/2",
      type: "function",
      specs: [
        "@spec day_of_week(Calendar.date(), starting_on :: :default | atom()) ::\n        Calendar.day_of_week()",
      ],
      documentation:
        "Calculates the day of the week of a given `date`.\n\nReturns the day of the week as an integer. For the ISO 8601\ncalendar (the default), it is an integer from 1 to 7, where\n1 is Monday and 7 is Sunday.\n\nAn optional `starting_on` value may be supplied, which\nconfigures the weekday the week starts on. The default value\nfor it is `:default`, which translates to `:monday` for the\nbuilt-in ISO calendar. Any other weekday may be given to.\n\n## Examples\n\n    iex> Date.day_of_week(~D[2016-10-31])\n    1\n    iex> Date.day_of_week(~D[2016-11-01])\n    2\n    iex> Date.day_of_week(~N[2016-11-01 01:23:45])\n    2\n    iex> Date.day_of_week(~D[-0015-10-30])\n    3\n\n    iex> Date.day_of_week(~D[2016-10-31], :sunday)\n    2\n    iex> Date.day_of_week(~D[2016-11-01], :sunday)\n    3\n    iex> Date.day_of_week(~N[2016-11-01 01:23:45], :sunday)\n    3\n    iex> Date.day_of_week(~D[-0015-10-30], :sunday)\n    4\n\n",
    },
    {
      name: "day_of_era/1",
      type: "function",
      specs: [
        "@spec day_of_era(Calendar.date()) :: {Calendar.day(), non_neg_integer()}",
      ],
      documentation:
        "Calculates the day-of-era and era for a given\ncalendar `date`.\n\nReturns a tuple `{day, era}` representing the\nday within the era and the era number.\n\n## Examples\n\n    iex> Date.day_of_era(~D[0001-01-01])\n    {1, 1}\n\n    iex> Date.day_of_era(~D[0000-12-31])\n    {1, 0}\n\n",
    },
    {
      name: "convert!/2",
      type: "function",
      specs: ["@spec convert!(Calendar.date(), Calendar.calendar()) :: t()"],
      documentation:
        "Similar to `Date.convert/2`, but raises an `ArgumentError`\nif the conversion between the two calendars is not possible.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> Date.convert!(~D[2000-01-01], Calendar.Holocene)\n    %Date{calendar: Calendar.Holocene, year: 12000, month: 1, day: 1}\n\n",
    },
    {
      name: "convert/2",
      type: "function",
      specs: [
        "@spec convert(Calendar.date(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, :incompatible_calendars}",
      ],
      documentation:
        "Converts the given `date` from its calendar to the given `calendar`.\n\nReturns `{:ok, date}` if the calendars are compatible,\nor `{:error, :incompatible_calendars}` if they are not.\n\nSee also `Calendar.compatible_calendars?/2`.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> Date.convert(~D[2000-01-01], Calendar.Holocene)\n    {:ok, %Date{calendar: Calendar.Holocene, year: 12000, month: 1, day: 1}}\n\n",
    },
    {
      name: "compare/2",
      type: "function",
      specs: [
        "@spec compare(Calendar.date(), Calendar.date()) :: :lt | :eq | :gt",
      ],
      documentation:
        "Compares two date structs.\n\nReturns `:gt` if first date is later than the second\nand `:lt` for vice versa. If the two dates are equal\n`:eq` is returned.\n\n## Examples\n\n    iex> Date.compare(~D[2016-04-16], ~D[2016-04-28])\n    :lt\n\nThis function can also be used to compare across more\ncomplex calendar types by considering only the date fields:\n\n    iex> Date.compare(~D[2016-04-16], ~N[2016-04-28 01:23:45])\n    :lt\n    iex> Date.compare(~D[2016-04-16], ~N[2016-04-16 01:23:45])\n    :eq\n    iex> Date.compare(~N[2016-04-16 12:34:56], ~N[2016-04-16 01:23:45])\n    :eq\n\n",
    },
    {
      name: "beginning_of_week/2",
      type: "function",
      specs: [
        "@spec beginning_of_week(Calendar.date(), starting_on :: :default | atom()) ::\n        t()",
      ],
      documentation:
        "Calculates a date that is the first day of the week for the given `date`.\n\nIf the day is already the first day of the week, it returns the\nday itself. For the built-in ISO calendar, the week starts on Monday.\nA weekday rather than `:default` can be given as `starting_on`.\n\n## Examples\n\n    iex> Date.beginning_of_week(~D[2020-07-11])\n    ~D[2020-07-06]\n    iex> Date.beginning_of_week(~D[2020-07-06])\n    ~D[2020-07-06]\n    iex> Date.beginning_of_week(~D[2020-07-11], :sunday)\n    ~D[2020-07-05]\n    iex> Date.beginning_of_week(~D[2020-07-11], :saturday)\n    ~D[2020-07-11]\n    iex> Date.beginning_of_week(~N[2020-07-11 01:23:45])\n    ~D[2020-07-06]\n\n",
    },
    {
      name: "beginning_of_month/1",
      type: "function",
      specs: ["@spec beginning_of_month(Calendar.date()) :: t()"],
      documentation:
        "Calculates a date that is the first day of the month for the given `date`.\n\n## Examples\n\n    iex> Date.beginning_of_month(~D[2000-01-31])\n    ~D[2000-01-01]\n    iex> Date.beginning_of_month(~D[2000-01-01])\n    ~D[2000-01-01]\n    iex> Date.beginning_of_month(~N[2000-01-31 01:23:45])\n    ~D[2000-01-01]\n\n",
    },
    {
      name: "before?/2",
      type: "function",
      specs: ["@spec before?(Calendar.date(), Calendar.date()) :: boolean()"],
      documentation:
        "Returns `true` if the first date is strictly earlier than the second.\n\n## Examples\n\n    iex> Date.before?(~D[2021-01-01], ~D[2022-02-02])\n    true\n    iex> Date.before?(~D[2021-01-01], ~D[2021-01-01])\n    false\n    iex> Date.before?(~D[2022-02-02], ~D[2021-01-01])\n    false\n\n",
    },
    {
      name: "after?/2",
      type: "function",
      specs: ["@spec after?(Calendar.date(), Calendar.date()) :: boolean()"],
      documentation:
        "Returns `true` if the first date is strictly later than the second.\n\n## Examples\n\n    iex> Date.after?(~D[2022-02-02], ~D[2021-01-01])\n    true\n    iex> Date.after?(~D[2021-01-01], ~D[2021-01-01])\n    false\n    iex> Date.after?(~D[2021-01-01], ~D[2022-02-02])\n    false\n\n",
    },
    {
      name: "add/2",
      type: "function",
      specs: ["@spec add(Calendar.date(), integer()) :: t()"],
      documentation:
        "Adds the number of days to the given `date`.\n\nThe days are counted as Gregorian days. The date is returned in the same\ncalendar as it was given in.\n\nTo shift a date by a `Duration` and according to its underlying calendar, use `Date.shift/2`.\n\n## Examples\n\n    iex> Date.add(~D[2000-01-03], -2)\n    ~D[2000-01-01]\n    iex> Date.add(~D[2000-01-01], 2)\n    ~D[2000-01-03]\n    iex> Date.add(~N[2000-01-01 09:00:00], 2)\n    ~D[2000-01-03]\n    iex> Date.add(~D[-0010-01-01], -2)\n    ~D[-0011-12-30]\n\n",
    },
  ],
  name: "Date",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Date{\n        calendar: Calendar.calendar(),\n        day: Calendar.day(),\n        month: Calendar.month(),\n        year: Calendar.year()\n      }",
      ],
      documentation: null,
    },
  ],
};
