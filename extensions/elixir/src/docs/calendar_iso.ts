import type { ModuleDoc } from "../types";

export const Calendar_ISO: ModuleDoc = {
  functions: [
    {
      name: "year_of_era/3",
      type: "function",
      specs: ["@spec year_of_era(year(), month(), day()) :: {1..10000, era()}"],
      documentation:
        "Calendar callback to compute the year and era from the\ngiven `year`, `month` and `day`.\n\nIn the ISO calendar, the new year coincides with the new era,\nso the `month` and `day` arguments are discarded. If you only\nhave the year available, you can `year_of_era/1` instead.\n\n## Examples\n\n    iex> Calendar.ISO.year_of_era(1, 1, 1)\n    {1, 1}\n    iex> Calendar.ISO.year_of_era(2018, 12, 1)\n    {2018, 1}\n    iex> Calendar.ISO.year_of_era(0, 1, 1)\n    {1, 0}\n    iex> Calendar.ISO.year_of_era(-1, 12, 1)\n    {2, 0}\n\n",
    },
    {
      name: "year_of_era/1",
      type: "function",
      specs: ["@spec year_of_era(year()) :: {1..10000, era()}"],
      documentation:
        'Calculates the year and era from the given `year`.\n\nThe ISO calendar has two eras: the "current era" (CE) which\nstarts in year `1` and is defined as era `1`. And "before the current\nera" (BCE) for those years less than `1`, defined as era `0`.\n\n## Examples\n\n    iex> Calendar.ISO.year_of_era(1)\n    {1, 1}\n    iex> Calendar.ISO.year_of_era(2018)\n    {2018, 1}\n    iex> Calendar.ISO.year_of_era(0)\n    {1, 0}\n    iex> Calendar.ISO.year_of_era(-1)\n    {2, 0}\n\n',
    },
    {
      name: "valid_time?/4",
      type: "function",
      specs: [
        "@spec valid_time?(\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond()\n      ) :: boolean()",
      ],
      documentation:
        "Determines if the date given is valid according to the proleptic Gregorian calendar.\n\nLeap seconds are not supported by the built-in Calendar.ISO.\n\n## Examples\n\n    iex> Calendar.ISO.valid_time?(10, 50, 25, {3006, 6})\n    true\n    iex> Calendar.ISO.valid_time?(23, 59, 60, {0, 0})\n    false\n    iex> Calendar.ISO.valid_time?(24, 0, 0, {0, 0})\n    false\n\n",
    },
    {
      name: "valid_date?/3",
      type: "function",
      specs: ["@spec valid_date?(year(), month(), day()) :: boolean()"],
      documentation:
        "Determines if the date given is valid according to the proleptic Gregorian calendar.\n\n## Examples\n\n    iex> Calendar.ISO.valid_date?(2015, 2, 28)\n    true\n    iex> Calendar.ISO.valid_date?(2015, 2, 30)\n    false\n    iex> Calendar.ISO.valid_date?(-1, 12, 31)\n    true\n    iex> Calendar.ISO.valid_date?(-1, 12, 32)\n    false\n\n",
    },
    {
      name: "time_unit_to_precision/1",
      type: "function",
      specs: ["@spec time_unit_to_precision(System.time_unit()) :: 0..6"],
      documentation:
        "Converts a `t:System.time_unit/0` to precision.\n\nInteger-based time units always get maximum precision.\n\n## Examples\n\n    iex> Calendar.ISO.time_unit_to_precision(:nanosecond)\n    6\n\n    iex> Calendar.ISO.time_unit_to_precision(:second)\n    0\n\n    iex> Calendar.ISO.time_unit_to_precision(1)\n    6\n\n",
    },
    {
      name: "time_to_string/5",
      type: "function",
      specs: [
        "@spec time_to_string(\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond(),\n        :basic | :extended\n      ) :: String.t()",
      ],
      documentation:
        'Converts the given time into a string.\n\nBy default, returns times formatted in the "extended" format,\nfor human readability. It also supports the "basic" format\nby passing the `:basic` option.\n\n## Examples\n\n    iex> Calendar.ISO.time_to_string(2, 2, 2, {2, 6})\n    "02:02:02.000002"\n    iex> Calendar.ISO.time_to_string(2, 2, 2, {2, 2})\n    "02:02:02.00"\n    iex> Calendar.ISO.time_to_string(2, 2, 2, {2, 0})\n    "02:02:02"\n\n    iex> Calendar.ISO.time_to_string(2, 2, 2, {2, 6}, :basic)\n    "020202.000002"\n    iex> Calendar.ISO.time_to_string(2, 2, 2, {2, 6}, :extended)\n    "02:02:02.000002"\n\n',
    },
    {
      name: "time_to_day_fraction/4",
      type: "function",
      specs: [
        "@spec time_to_day_fraction(\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond()\n      ) :: Calendar.day_fraction()",
      ],
      documentation:
        "Returns the normalized day fraction of the specified time.\n\n## Examples\n\n    iex> Calendar.ISO.time_to_day_fraction(0, 0, 0, {0, 6})\n    {0, 86400000000}\n    iex> Calendar.ISO.time_to_day_fraction(12, 34, 56, {123, 6})\n    {45296000123, 86400000000}\n\n",
    },
    {
      name: "time_from_day_fraction/1",
      type: "function",
      specs: [
        "@spec time_from_day_fraction(Calendar.day_fraction()) ::\n        {hour(), minute(), second(), microsecond()}",
      ],
      documentation:
        "Converts a day fraction to this Calendar's representation of time.\n\n## Examples\n\n    iex> Calendar.ISO.time_from_day_fraction({1, 2})\n    {12, 0, 0, {0, 6}}\n    iex> Calendar.ISO.time_from_day_fraction({13, 24})\n    {13, 0, 0, {0, 6}}\n\n",
    },
    {
      name: "shift_time/5",
      type: "function",
      specs: [
        "@spec shift_time(hour(), minute(), second(), microsecond(), Duration.t()) ::\n        {hour(), minute(), second(), microsecond()}",
      ],
      documentation:
        "Shifts Time by Duration units according to its calendar.\n\n## Examples\n\n    iex> Calendar.ISO.shift_time(13, 0, 0, {0, 0}, Duration.new!(hour: 2))\n    {15, 0, 0, {0, 0}}\n    iex> Calendar.ISO.shift_time(13, 0, 0, {0, 0}, Duration.new!(microsecond: {100, 6}))\n    {13, 0, 0, {100, 6}}\n",
    },
    {
      name: "shift_naive_datetime/8",
      type: "function",
      specs: [
        "@spec shift_naive_datetime(\n        year(),\n        month(),\n        day(),\n        hour(),\n        minute(),\n        second(),\n        microsecond(),\n        Duration.t()\n      ) :: {year(), month(), day(), hour(), minute(), second(), microsecond()}",
      ],
      documentation:
        "Shifts NaiveDateTime by Duration according to its calendar.\n\n## Examples\n\n    iex> Calendar.ISO.shift_naive_datetime(2016, 1, 3, 0, 0, 0, {0, 0}, Duration.new!(hour: 1))\n    {2016, 1, 3, 1, 0, 0, {0, 0}}\n    iex> Calendar.ISO.shift_naive_datetime(2016, 1, 3, 0, 0, 0, {0, 0}, Duration.new!(hour: 30))\n    {2016, 1, 4, 6, 0, 0, {0, 0}}\n    iex> Calendar.ISO.shift_naive_datetime(2016, 1, 3, 0, 0, 0, {0, 0}, Duration.new!(microsecond: {100, 6}))\n    {2016, 1, 3, 0, 0, 0, {100, 6}}\n",
    },
    {
      name: "shift_date/4",
      type: "function",
      specs: [
        "@spec shift_date(year(), month(), day(), Duration.t()) ::\n        {year(), month(), day()}",
      ],
      documentation:
        "Shifts Date by Duration according to its calendar.\n\n## Examples\n\n    iex> Calendar.ISO.shift_date(2016, 1, 3, Duration.new!(month: 2))\n    {2016, 3, 3}\n    iex> Calendar.ISO.shift_date(2016, 2, 29, Duration.new!(month: 1))\n    {2016, 3, 29}\n    iex> Calendar.ISO.shift_date(2016, 1, 31, Duration.new!(month: 1))\n    {2016, 2, 29}\n    iex> Calendar.ISO.shift_date(2016, 1, 31, Duration.new!(year: 4, day: 1))\n    {2020, 2, 1}\n",
    },
    {
      name: "quarter_of_year/3",
      type: "function",
      specs: [
        "@spec quarter_of_year(year(), month(), day()) :: quarter_of_year()",
      ],
      documentation:
        "Calculates the quarter of the year from the given `year`, `month`, and `day`.\n\nIt is an integer from 1 to 4.\n\n## Examples\n\n    iex> Calendar.ISO.quarter_of_year(2016, 1, 31)\n    1\n    iex> Calendar.ISO.quarter_of_year(2016, 4, 3)\n    2\n    iex> Calendar.ISO.quarter_of_year(-99, 9, 31)\n    3\n    iex> Calendar.ISO.quarter_of_year(2018, 12, 28)\n    4\n\n",
    },
    {
      name: "parse_utc_datetime/2",
      type: "function",
      specs: [
        "@spec parse_utc_datetime(String.t(), format()) ::\n        {:ok,\n         {year(), month(), day(), hour(), minute(), second(), microsecond()},\n         utc_offset()}\n        | {:error, atom()}",
      ],
      documentation:
        'Parses a UTC datetime `string` according to a given `format`.\n\nThe `format` can either be `:basic` or `:extended`.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_utc_datetime("20150123 235007Z", :basic)\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 0}}, 0}\n    iex> Calendar.ISO.parse_utc_datetime("20150123 235007Z", :extended)\n    {:error, :invalid_format}\n\n',
    },
    {
      name: "parse_utc_datetime/1",
      type: "function",
      specs: [
        "@spec parse_utc_datetime(String.t()) ::\n        {:ok,\n         {year(), month(), day(), hour(), minute(), second(), microsecond()},\n         utc_offset()}\n        | {:error, atom()}",
      ],
      documentation:
        'Parses a UTC datetime `string` in the `:extended` format.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_utc_datetime("2015-01-23 23:50:07Z")\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 0}}, 0}\n\n    iex> Calendar.ISO.parse_utc_datetime("2015-01-23 23:50:07+02:30")\n    {:ok, {2015, 1, 23, 21, 20, 7, {0, 0}}, 9000}\n\n    iex> Calendar.ISO.parse_utc_datetime("2015-01-23 23:50:07")\n    {:error, :missing_offset}\n\n',
    },
    {
      name: "parse_time/2",
      type: "function",
      specs: [
        "@spec parse_time(String.t(), format()) ::\n        {:ok, {hour(), minute(), second(), microsecond()}} | {:error, atom()}",
      ],
      documentation:
        'Parses a time `string` according to a given `format`.\n\nThe `format` can either be `:basic` or `:extended`.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_time("235007", :basic)\n    {:ok, {23, 50, 7, {0, 0}}}\n    iex> Calendar.ISO.parse_time("235007", :extended)\n    {:error, :invalid_format}\n\n',
    },
    {
      name: "parse_time/1",
      type: "function",
      specs: [
        "@spec parse_time(String.t()) ::\n        {:ok, {hour(), minute(), second(), microsecond()}} | {:error, atom()}",
      ],
      documentation:
        'Parses a time `string` in the `:extended` format.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_time("23:50:07")\n    {:ok, {23, 50, 7, {0, 0}}}\n\n    iex> Calendar.ISO.parse_time("23:50:07Z")\n    {:ok, {23, 50, 7, {0, 0}}}\n    iex> Calendar.ISO.parse_time("T23:50:07Z")\n    {:ok, {23, 50, 7, {0, 0}}}\n\n',
    },
    {
      name: "parse_naive_datetime/2",
      type: "function",
      specs: [
        "@spec parse_naive_datetime(String.t(), format()) ::\n        {:ok,\n         {year(), month(), day(), hour(), minute(), second(), microsecond()}}\n        | {:error, atom()}",
      ],
      documentation:
        'Parses a naive datetime `string` according to a given `format`.\n\nThe `format` can either be `:basic` or `:extended`.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_naive_datetime("20150123 235007", :basic)\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 0}}}\n    iex> Calendar.ISO.parse_naive_datetime("20150123 235007", :extended)\n    {:error, :invalid_format}\n\n',
    },
    {
      name: "parse_naive_datetime/1",
      type: "function",
      specs: [
        "@spec parse_naive_datetime(String.t()) ::\n        {:ok,\n         {year(), month(), day(), hour(), minute(), second(), microsecond()}}\n        | {:error, atom()}",
      ],
      documentation:
        'Parses a naive datetime `string` in the `:extended` format.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_naive_datetime("2015-01-23 23:50:07")\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 0}}}\n    iex> Calendar.ISO.parse_naive_datetime("2015-01-23 23:50:07Z")\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 0}}}\n    iex> Calendar.ISO.parse_naive_datetime("2015-01-23 23:50:07-02:30")\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 0}}}\n\n    iex> Calendar.ISO.parse_naive_datetime("2015-01-23 23:50:07.0")\n    {:ok, {2015, 1, 23, 23, 50, 7, {0, 1}}}\n    iex> Calendar.ISO.parse_naive_datetime("2015-01-23 23:50:07,0123456")\n    {:ok, {2015, 1, 23, 23, 50, 7, {12345, 6}}}\n\n',
    },
    {
      name: "parse_duration/1",
      type: "function",
      specs: [
        "@spec parse_duration(String.t()) ::\n        {:ok, [Duration.unit_pair()]} | {:error, atom()}",
      ],
      documentation:
        "Parses an ISO 8601 formatted duration string to a list of `Duration` compabitble unit pairs.\n\nSee `Duration.from_iso8601/1`.\n",
    },
    {
      name: "parse_date/2",
      type: "function",
      specs: [
        "@spec parse_date(String.t(), format()) ::\n        {:ok, {year(), month(), day()}} | {:error, atom()}",
      ],
      documentation:
        'Parses a date `string` according to a given `format`.\n\nThe `format` can either be `:basic` or `:extended`.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_date("20150123", :basic)\n    {:ok, {2015, 1, 23}}\n    iex> Calendar.ISO.parse_date("20150123", :extended)\n    {:error, :invalid_format}\n\n',
    },
    {
      name: "parse_date/1",
      type: "function",
      specs: [
        "@spec parse_date(String.t()) ::\n        {:ok, {year(), month(), day()}} | {:error, atom()}",
      ],
      documentation:
        'Parses a date `string` in the `:extended` format.\n\nFor more information on supported strings, see how this\nmodule implements [ISO 8601](#module-iso-8601-compliance).\n\n## Examples\n\n    iex> Calendar.ISO.parse_date("2015-01-23")\n    {:ok, {2015, 1, 23}}\n\n    iex> Calendar.ISO.parse_date("2015:01:23")\n    {:error, :invalid_format}\n    iex> Calendar.ISO.parse_date("2015-01-32")\n    {:error, :invalid_date}\n\n',
    },
    {
      name: "naive_datetime_to_string/8",
      type: "function",
      specs: [
        "@spec naive_datetime_to_string(\n        year(),\n        month(),\n        day(),\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond(),\n        :basic | :extended\n      ) :: String.t()",
      ],
      documentation:
        'Converts the datetime (without time zone) into a string.\n\nBy default, returns datetimes formatted in the "extended" format,\nfor human readability. It also supports the "basic" format\nby passing the `:basic` option.\n\n## Examples\n\n    iex> Calendar.ISO.naive_datetime_to_string(2015, 2, 28, 1, 2, 3, {4, 6})\n    "2015-02-28 01:02:03.000004"\n    iex> Calendar.ISO.naive_datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5})\n    "2017-08-01 01:02:03.00000"\n\n    iex> Calendar.ISO.naive_datetime_to_string(2015, 2, 28, 1, 2, 3, {4, 6}, :basic)\n    "20150228 010203.000004"\n\n',
    },
    {
      name: "naive_datetime_to_iso_days/7",
      type: "function",
      specs: [
        "@spec naive_datetime_to_iso_days(\n        Calendar.year(),\n        Calendar.month(),\n        Calendar.day(),\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond()\n      ) :: Calendar.iso_days()",
      ],
      documentation:
        "Returns the `t:Calendar.iso_days/0` format of the specified date.\n\n## Examples\n\n    iex> Calendar.ISO.naive_datetime_to_iso_days(0, 1, 1, 0, 0, 0, {0, 6})\n    {0, {0, 86400000000}}\n    iex> Calendar.ISO.naive_datetime_to_iso_days(2000, 1, 1, 12, 0, 0, {0, 6})\n    {730485, {43200000000, 86400000000}}\n    iex> Calendar.ISO.naive_datetime_to_iso_days(2000, 1, 1, 13, 0, 0, {0, 6})\n    {730485, {46800000000, 86400000000}}\n    iex> Calendar.ISO.naive_datetime_to_iso_days(-1, 1, 1, 0, 0, 0, {0, 6})\n    {-365, {0, 86400000000}}\n\n",
    },
    {
      name: "naive_datetime_from_iso_days/1",
      type: "function",
      specs: [
        "@spec naive_datetime_from_iso_days(Calendar.iso_days()) ::\n        {Calendar.year(), Calendar.month(), Calendar.day(), Calendar.hour(),\n         Calendar.minute(), Calendar.second(), Calendar.microsecond()}",
      ],
      documentation:
        "Converts the `t:Calendar.iso_days/0` format to the datetime format specified by this calendar.\n\n## Examples\n\n    iex> Calendar.ISO.naive_datetime_from_iso_days({0, {0, 86400}})\n    {0, 1, 1, 0, 0, 0, {0, 6}}\n    iex> Calendar.ISO.naive_datetime_from_iso_days({730_485, {0, 86400}})\n    {2000, 1, 1, 0, 0, 0, {0, 6}}\n    iex> Calendar.ISO.naive_datetime_from_iso_days({730_485, {43200, 86400}})\n    {2000, 1, 1, 12, 0, 0, {0, 6}}\n    iex> Calendar.ISO.naive_datetime_from_iso_days({-365, {0, 86400000000}})\n    {-1, 1, 1, 0, 0, 0, {0, 6}}\n\n",
    },
    {
      name: "months_in_year/1",
      type: "function",
      specs: ["@spec months_in_year(year()) :: 12"],
      documentation:
        "Returns how many months there are in the given year.\n\n## Example\n\n    iex> Calendar.ISO.months_in_year(2004)\n    12\n\n",
    },
    {
      name: "leap_year?/1",
      type: "function",
      specs: ["@spec leap_year?(year()) :: boolean()"],
      documentation:
        "Returns if the given year is a leap year.\n\n## Examples\n\n    iex> Calendar.ISO.leap_year?(2000)\n    true\n    iex> Calendar.ISO.leap_year?(2001)\n    false\n    iex> Calendar.ISO.leap_year?(2004)\n    true\n    iex> Calendar.ISO.leap_year?(1900)\n    false\n    iex> Calendar.ISO.leap_year?(-4)\n    true\n\n",
    },
    {
      name: "iso_days_to_end_of_day/1",
      type: "function",
      specs: [
        "@spec iso_days_to_end_of_day(Calendar.iso_days()) :: Calendar.iso_days()",
      ],
      documentation:
        "Converts the `t:Calendar.iso_days/0` to the last moment of the day.\n\n## Examples\n\n    iex> Calendar.ISO.iso_days_to_end_of_day({0, {0, 86400000000}})\n    {0, {86399999999, 86400000000}}\n    iex> Calendar.ISO.iso_days_to_end_of_day({730485, {43200000000, 86400000000}})\n    {730485, {86399999999, 86400000000}}\n    iex> Calendar.ISO.iso_days_to_end_of_day({730485, {46800000000, 86400000000}})\n    {730485, {86399999999, 86400000000}}\n\n",
    },
    {
      name: "iso_days_to_beginning_of_day/1",
      type: "function",
      specs: [
        "@spec iso_days_to_beginning_of_day(Calendar.iso_days()) :: Calendar.iso_days()",
      ],
      documentation:
        "Converts the `t:Calendar.iso_days/0` to the first moment of the day.\n\n## Examples\n\n    iex> Calendar.ISO.iso_days_to_beginning_of_day({0, {0, 86400000000}})\n    {0, {0, 86400000000}}\n    iex> Calendar.ISO.iso_days_to_beginning_of_day({730485, {43200000000, 86400000000}})\n    {730485, {0, 86400000000}}\n    iex> Calendar.ISO.iso_days_to_beginning_of_day({730485, {46800000000, 86400000000}})\n    {730485, {0, 86400000000}}\n\n",
    },
    {
      name: "days_in_month/2",
      type: "function",
      specs: ["@spec days_in_month(year(), month()) :: 28..31"],
      documentation:
        "Returns how many days there are in the given year-month.\n\n## Examples\n\n    iex> Calendar.ISO.days_in_month(1900, 1)\n    31\n    iex> Calendar.ISO.days_in_month(1900, 2)\n    28\n    iex> Calendar.ISO.days_in_month(2000, 2)\n    29\n    iex> Calendar.ISO.days_in_month(2001, 2)\n    28\n    iex> Calendar.ISO.days_in_month(2004, 2)\n    29\n    iex> Calendar.ISO.days_in_month(2004, 4)\n    30\n    iex> Calendar.ISO.days_in_month(-1, 5)\n    31\n\n",
    },
    {
      name: "day_rollover_relative_to_midnight_utc/0",
      type: "function",
      specs: ["@spec day_rollover_relative_to_midnight_utc() :: {0, 1}"],
      documentation:
        "See `c:Calendar.day_rollover_relative_to_midnight_utc/0` for documentation.\n",
    },
    {
      name: "day_of_year/3",
      type: "function",
      specs: ["@spec day_of_year(year(), month(), day()) :: day_of_year()"],
      documentation:
        "Calculates the day of the year from the given `year`, `month`, and `day`.\n\nIt is an integer from 1 to 366.\n\n## Examples\n\n    iex> Calendar.ISO.day_of_year(2016, 1, 31)\n    31\n    iex> Calendar.ISO.day_of_year(-99, 2, 1)\n    32\n    iex> Calendar.ISO.day_of_year(2018, 2, 28)\n    59\n\n",
    },
    {
      name: "day_of_week/4",
      type: "function",
      specs: [
        "@spec day_of_week(year(), month(), day(), :default | weekday()) ::\n        {day_of_week(), 1, 7}",
      ],
      documentation:
        "Calculates the day of the week from the given `year`, `month`, and `day`.\n\nIt is an integer from 1 to 7, where 1 is the given `starting_on` weekday.\nFor example, if `starting_on` is set to `:monday`, then 1 is Monday and\n7 is Sunday.\n\n`starting_on` can also be `:default`, which is equivalent to `:monday`.\n\n## Examples\n\n    iex> Calendar.ISO.day_of_week(2016, 10, 31, :monday)\n    {1, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 1, :monday)\n    {2, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 2, :monday)\n    {3, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 3, :monday)\n    {4, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 4, :monday)\n    {5, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 5, :monday)\n    {6, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 6, :monday)\n    {7, 1, 7}\n    iex> Calendar.ISO.day_of_week(-99, 1, 31, :monday)\n    {4, 1, 7}\n\n    iex> Calendar.ISO.day_of_week(2016, 10, 31, :sunday)\n    {2, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 1, :sunday)\n    {3, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 2, :sunday)\n    {4, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 3, :sunday)\n    {5, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 4, :sunday)\n    {6, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 5, :sunday)\n    {7, 1, 7}\n    iex> Calendar.ISO.day_of_week(2016, 11, 6, :sunday)\n    {1, 1, 7}\n    iex> Calendar.ISO.day_of_week(-99, 1, 31, :sunday)\n    {5, 1, 7}\n\n    iex> Calendar.ISO.day_of_week(2016, 10, 31, :saturday)\n    {3, 1, 7}\n\n",
    },
    {
      name: "day_of_era/3",
      type: "function",
      specs: [
        "@spec day_of_era(year(), month(), day()) :: Calendar.day_of_era()",
      ],
      documentation:
        "Calculates the day and era from the given `year`, `month`, and `day`.\n\n## Examples\n\n    iex> Calendar.ISO.day_of_era(0, 1, 1)\n    {366, 0}\n    iex> Calendar.ISO.day_of_era(1, 1, 1)\n    {1, 1}\n    iex> Calendar.ISO.day_of_era(0, 12, 31)\n    {1, 0}\n    iex> Calendar.ISO.day_of_era(0, 12, 30)\n    {2, 0}\n    iex> Calendar.ISO.day_of_era(-1, 12, 31)\n    {367, 0}\n\n",
    },
    {
      name: "datetime_to_string/12",
      type: "function",
      specs: [
        "@spec datetime_to_string(\n        year(),\n        month(),\n        day(),\n        Calendar.hour(),\n        Calendar.minute(),\n        Calendar.second(),\n        Calendar.microsecond(),\n        Calendar.time_zone(),\n        Calendar.zone_abbr(),\n        Calendar.utc_offset(),\n        Calendar.std_offset(),\n        :basic | :extended\n      ) :: String.t()",
      ],
      documentation:
        'Converts the datetime (with time zone) into a string.\n\nBy default, returns datetimes formatted in the "extended" format,\nfor human readability. It also supports the "basic" format\nby passing the `:basic` option.\n\n## Examples\n\n    iex> time_zone = "Etc/UTC"\n    iex> Calendar.ISO.datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5}, time_zone, "UTC", 0, 0)\n    "2017-08-01 01:02:03.00000Z"\n    iex> Calendar.ISO.datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5}, time_zone, "UTC", 3600, 0)\n    "2017-08-01 01:02:03.00000+01:00"\n    iex> Calendar.ISO.datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5}, time_zone, "UTC", 3600, 3600)\n    "2017-08-01 01:02:03.00000+02:00"\n\n    iex> time_zone = "Europe/Berlin"\n    iex> Calendar.ISO.datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5}, time_zone, "CET", 3600, 0)\n    "2017-08-01 01:02:03.00000+01:00 CET Europe/Berlin"\n    iex> Calendar.ISO.datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5}, time_zone, "CDT", 3600, 3600)\n    "2017-08-01 01:02:03.00000+02:00 CDT Europe/Berlin"\n\n    iex> time_zone = "America/Los_Angeles"\n    iex> Calendar.ISO.datetime_to_string(2015, 2, 28, 1, 2, 3, {4, 5}, time_zone, "PST", -28800, 0)\n    "2015-02-28 01:02:03.00000-08:00 PST America/Los_Angeles"\n    iex> Calendar.ISO.datetime_to_string(2015, 2, 28, 1, 2, 3, {4, 5}, time_zone, "PDT", -28800, 3600)\n    "2015-02-28 01:02:03.00000-07:00 PDT America/Los_Angeles"\n\n    iex> time_zone = "Europe/Berlin"\n    iex> Calendar.ISO.datetime_to_string(2017, 8, 1, 1, 2, 3, {4, 5}, time_zone, "CET", 3600, 0, :basic)\n    "20170801 010203.00000+0100 CET Europe/Berlin"\n\n',
    },
    {
      name: "date_to_string/4",
      type: "function",
      specs: [
        "@spec date_to_string(year(), month(), day(), :basic | :extended) :: String.t()",
      ],
      documentation:
        'Converts the given date into a string.\n\nBy default, returns dates formatted in the "extended" format,\nfor human readability. It also supports the "basic" format\nby passing the `:basic` option.\n\n## Examples\n\n    iex> Calendar.ISO.date_to_string(2015, 2, 28)\n    "2015-02-28"\n    iex> Calendar.ISO.date_to_string(2017, 8, 1)\n    "2017-08-01"\n    iex> Calendar.ISO.date_to_string(-99, 1, 31)\n    "-0099-01-31"\n\n    iex> Calendar.ISO.date_to_string(2015, 2, 28, :basic)\n    "20150228"\n    iex> Calendar.ISO.date_to_string(-99, 1, 31, :basic)\n    "-00990131"\n\n',
    },
  ],
  name: "Calendar.ISO",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "year_of_era/0",
      type: "type",
      specs: ["@type year_of_era() :: {1..10000, era()}"],
      documentation: null,
    },
    {
      name: "quarter_of_year/0",
      type: "type",
      specs: ["@type quarter_of_year() :: 1..4"],
      documentation: null,
    },
    {
      name: "day_of_year/0",
      type: "type",
      specs: ["@type day_of_year() :: 1..366"],
      documentation: null,
    },
    {
      name: "day_of_week/0",
      type: "type",
      specs: ["@type day_of_week() :: 1..7"],
      documentation:
        "Integer that represents the day of the week, where 1 is Monday and 7 is Sunday.\n",
    },
    {
      name: "microsecond/0",
      type: "type",
      specs: ["@type microsecond() :: {0..999_999, 0..6}"],
      documentation:
        "Microseconds with stored precision.\n\nThe precision represents the number of digits that must be used when\nrepresenting the microseconds to external format. If the precision is 0,\nit means microseconds must be skipped.\n",
    },
    {
      name: "format/0",
      type: "type",
      specs: ["@type format() :: :basic | :extended"],
      documentation: null,
    },
    {
      name: "utc_offset/0",
      type: "type",
      specs: ["@type utc_offset() :: integer()"],
      documentation: null,
    },
    {
      name: "weekday/0",
      type: "type",
      specs: [
        "@type weekday() ::\n        :monday\n        | :tuesday\n        | :wednesday\n        | :thursday\n        | :friday\n        | :saturday\n        | :sunday",
      ],
      documentation: null,
    },
    {
      name: "second/0",
      type: "type",
      specs: ["@type second() :: 0..59"],
      documentation: null,
    },
    {
      name: "minute/0",
      type: "type",
      specs: ["@type minute() :: 0..59"],
      documentation: null,
    },
    {
      name: "hour/0",
      type: "type",
      specs: ["@type hour() :: 0..23"],
      documentation: null,
    },
    {
      name: "day/0",
      type: "type",
      specs: ["@type day() :: 1..31"],
      documentation: null,
    },
    {
      name: "month/0",
      type: "type",
      specs: ["@type month() :: 1..12"],
      documentation: null,
    },
    {
      name: "year/0",
      type: "type",
      specs: ["@type year() :: -9999..9999"],
      documentation: null,
    },
    {
      name: "era/0",
      type: "type",
      specs: ["@type era() :: bce() | ce()"],
      documentation:
        "The calendar era.\n\nThe ISO calendar has two eras:\n* [CE](`t:ce/0`) - which starts in year `1` and is defined as era `1`.\n* [BCE](`t:bce/0`) - for those years less than `1` and is defined as era `0`.\n",
    },
    {
      name: "ce/0",
      type: "type",
      specs: ["@type ce() :: 1"],
      documentation:
        'The "Current Era" or the "Common Era" (CE) which starts in year `1`.\n',
    },
    {
      name: "bce/0",
      type: "type",
      specs: ["@type bce() :: 0"],
      documentation:
        '"Before the Current Era" or "Before the Common Era" (BCE), for those years less than `1`.\n',
    },
  ],
};
