import type { ModuleDoc } from "../types";

export const Calendar: ModuleDoc = {
  functions: [
    {
      name: "truncate/2",
      type: "function",
      specs: [
        "@spec truncate(microsecond(), :microsecond | :millisecond | :second) ::\n        microsecond()",
      ],
      documentation:
        "Returns a microsecond tuple truncated to a given precision (`:microsecond`,\n`:millisecond`, or `:second`).\n",
    },
    {
      name: "strftime/3",
      type: "function",
      specs: ["@spec strftime(map(), String.t(), keyword()) :: String.t()"],
      documentation:
        'Formats the given date, time, or datetime into a string.\n\nThe datetime can be any of the `Calendar` types (`Time`, `Date`,\n`NaiveDateTime`, and `DateTime`) or any map, as long as they\ncontain all of the relevant fields necessary for formatting.\nFor example, if you use `%Y` to format the year, the datetime\nmust have the `:year` field. Therefore, if you pass a `Time`,\nor a map without the `:year` field to a format that expects `%Y`,\nan error will be raised.\n\nExamples of common usage:\n\n    iex> Calendar.strftime(~U[2019-08-26 13:52:06.0Z], "%y-%m-%d %I:%M:%S %p")\n    "19-08-26 01:52:06 PM"\n\n    iex> Calendar.strftime(~U[2019-08-26 13:52:06.0Z], "%a, %B %d %Y")\n    "Mon, August 26 2019"\n\n## User Options\n\n  * `:preferred_datetime` - a string for the preferred format to show datetimes,\n    it can\'t contain the `%c` format and defaults to `"%Y-%m-%d %H:%M:%S"`\n    if the option is not received\n\n  * `:preferred_date` - a string for the preferred format to show dates,\n    it can\'t contain the `%x` format and defaults to `"%Y-%m-%d"`\n    if the option is not received\n\n  * `:preferred_time` - a string for the preferred format to show times,\n    it can\'t contain the `%X` format and defaults to `"%H:%M:%S"`\n    if the option is not received\n\n  * `:am_pm_names` - a function that receives either `:am` or `:pm` and returns\n    the name of the period of the day, if the option is not received it defaults\n    to a function that returns `"am"` and `"pm"`, respectively\n\n  *  `:month_names` - a function that receives a number and returns the name of\n    the corresponding month, if the option is not received it defaults to a\n    function that returns the month names in English\n\n  * `:abbreviated_month_names` - a function that receives a number and returns the\n    abbreviated name of the corresponding month, if the option is not received it\n    defaults to a function that returns the abbreviated month names in English\n\n  * `:day_of_week_names` - a function that receives a number and returns the name of\n    the corresponding day of week, if the option is not received it defaults to a\n    function that returns the day of week names in English\n\n  * `:abbreviated_day_of_week_names` - a function that receives a number and returns\n    the abbreviated name of the corresponding day of week, if the option is not received\n    it defaults to a function that returns the abbreviated day of week names in English\n\n## Formatting syntax\n\nThe formatting syntax for the `string_format` argument is a sequence of characters in\nthe following format:\n\n    %<padding><width><format>\n\nwhere:\n\n  * `%`: indicates the start of a formatted section\n  * `<padding>`: set the padding (see below)\n  * `<width>`: a number indicating the minimum size of the formatted section\n  * `<format>`: the format itself (see below)\n\n### Accepted padding options\n\n  * `-`: no padding, removes all padding from the format\n  * `_`: pad with spaces\n  * `0`: pad with zeroes\n\n### Accepted string formats\n\nThe accepted formats for `string_format` are:\n\nFormat | Description                                                             | Examples (in ISO)\n:----- | :-----------------------------------------------------------------------| :------------------------\na      | Abbreviated name of day                                                 | Mon\nA      | Full name of day                                                        | Monday\nb      | Abbreviated month name                                                  | Jan\nB      | Full month name                                                         | January\nc      | Preferred date+time representation                                      | 2018-10-17 12:34:56\nd      | Day of the month                                                        | 01, 31\nf      | Microseconds *(does not support width and padding modifiers)*           | 000000, 999999, 0123\nH      | Hour using a 24-hour clock                                              | 00, 23\nI      | Hour using a 12-hour clock                                              | 01, 12\nj      | Day of the year                                                         | 001, 366\nm      | Month                                                                   | 01, 12\nM      | Minute                                                                  | 00, 59\np      | "AM" or "PM" (noon is "PM", midnight as "AM")                           | AM, PM\nP      | "am" or "pm" (noon is "pm", midnight as "am")                           | am, pm\nq      | Quarter                                                                 | 1, 2, 3, 4\ns      | Number of seconds since the Epoch, 1970-01-01 00:00:00+0000 (UTC)       | 1565888877\nS      | Second                                                                  | 00, 59, 60\nu      | Day of the week                                                         | 1 (Monday), 7 (Sunday)\nx      | Preferred date (without time) representation                            | 2018-10-17\nX      | Preferred time (without date) representation                            | 12:34:56\ny      | Year as 2-digits                                                        | 01, 01, 86, 18\nY      | Year                                                                    | -0001, 0001, 1986\nz      | +hhmm/-hhmm time zone offset from UTC (empty string if naive)           | +0300, -0530\nZ      | Time zone abbreviation (empty string if naive)                          | CET, BRST\n%      | Literal "%" character                                                   | %\n\nAny other character will be interpreted as an invalid format and raise an error.\n\n## Examples\n\nWithout user options:\n\n    iex> Calendar.strftime(~U[2019-08-26 13:52:06.0Z], "%y-%m-%d %I:%M:%S %p")\n    "19-08-26 01:52:06 PM"\n\n    iex> Calendar.strftime(~U[2019-08-26 13:52:06.0Z], "%a, %B %d %Y")\n    "Mon, August 26 2019"\n\n    iex> Calendar.strftime(~U[2020-04-02 13:52:06.0Z], "%B %-d, %Y")\n    "April 2, 2020"\n\n    iex> Calendar.strftime(~U[2019-08-26 13:52:06.0Z], "%c")\n    "2019-08-26 13:52:06"\n\nWith user options:\n\n    iex> Calendar.strftime(~U[2019-08-26 13:52:06.0Z], "%c", preferred_datetime: "%H:%M:%S %d-%m-%y")\n    "13:52:06 26-08-19"\n\n    iex> Calendar.strftime(\n    ...>  ~U[2019-08-26 13:52:06.0Z],\n    ...>  "%A",\n    ...>  day_of_week_names: fn day_of_week ->\n    ...>    {"segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",\n    ...>    "sexta-feira", "sábado", "domingo"}\n    ...>    |> elem(day_of_week - 1)\n    ...>  end\n    ...>)\n    "segunda-feira"\n\n    iex> Calendar.strftime(\n    ...>  ~U[2019-08-26 13:52:06.0Z],\n    ...>  "%B",\n    ...>  month_names: fn month ->\n    ...>    {"січень", "лютий", "березень", "квітень", "травень", "червень",\n    ...>    "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"}\n    ...>    |> elem(month - 1)\n    ...>  end\n    ...>)\n    "серпень"\n\n',
    },
    {
      name: "put_time_zone_database/1",
      type: "function",
      specs: ["@spec put_time_zone_database(time_zone_database()) :: :ok"],
      documentation: "Sets the current time zone database.\n",
    },
    {
      name: "get_time_zone_database/0",
      type: "function",
      specs: ["@spec get_time_zone_database() :: time_zone_database()"],
      documentation: "Gets the current time zone database.\n",
    },
    {
      name: "compatible_calendars?/2",
      type: "function",
      specs: [
        "@spec compatible_calendars?(calendar(), calendar()) :: boolean()",
      ],
      documentation:
        "Returns `true` if two calendars have the same moment of starting a new day,\n`false` otherwise.\n\nIf two calendars are not compatible, we can only convert datetimes and times\nbetween them. If they are compatible, this means that we can also convert\ndates as well as naive datetimes between them.\n",
    },
  ],
  name: "Calendar",
  callbacks: [
    {
      name: "year_of_era/3",
      type: "callback",
      specs: [],
      documentation: "Calculates the year and era from the given `year`.\n",
    },
    {
      name: "valid_time?/4",
      type: "callback",
      specs: [],
      documentation:
        "Should return `true` if the given time describes a proper time in the calendar.\n",
    },
    {
      name: "valid_date?/3",
      type: "callback",
      specs: [],
      documentation:
        "Should return `true` if the given date describes a proper date in the calendar.\n",
    },
    {
      name: "time_to_string/4",
      type: "callback",
      specs: [],
      documentation:
        "Converts the time into a string according to the calendar.\n",
    },
    {
      name: "time_to_day_fraction/4",
      type: "callback",
      specs: [],
      documentation:
        "Converts the given time to the `t:day_fraction/0` format.\n",
    },
    {
      name: "time_from_day_fraction/1",
      type: "callback",
      specs: [],
      documentation:
        "Converts `t:day_fraction/0` to the calendar's time format.\n",
    },
    {
      name: "shift_time/5",
      type: "callback",
      specs: [],
      documentation:
        "Shifts time by given duration according to its calendar.\n",
    },
    {
      name: "shift_naive_datetime/8",
      type: "callback",
      specs: [],
      documentation:
        "Shifts naive datetime by given duration according to its calendar.\n",
    },
    {
      name: "shift_date/4",
      type: "callback",
      specs: [],
      documentation:
        "Shifts date by given duration according to its calendar.\n",
    },
    {
      name: "quarter_of_year/3",
      type: "callback",
      specs: [],
      documentation:
        "Calculates the quarter of the year from the given `year`, `month`, and `day`.\n",
    },
    {
      name: "parse_utc_datetime/1",
      type: "callback",
      specs: [],
      documentation:
        "Parses the string representation for a datetime returned by\n`c:datetime_to_string/11` into a datetime tuple.\n\nThe returned datetime must be in UTC. The original `utc_offset`\nit was written in must be returned in the result.\n",
    },
    {
      name: "parse_time/1",
      type: "callback",
      specs: [],
      documentation:
        "Parses the string representation for a time returned by `c:time_to_string/4`\ninto a time tuple.\n",
    },
    {
      name: "parse_naive_datetime/1",
      type: "callback",
      specs: [],
      documentation:
        "Parses the string representation for a naive datetime returned by\n`c:naive_datetime_to_string/7` into a naive datetime tuple.\n\nThe given string may contain a timezone offset but it is ignored.\n",
    },
    {
      name: "parse_date/1",
      type: "callback",
      specs: [],
      documentation:
        "Parses the string representation for a date returned by `c:date_to_string/3`\ninto a date tuple.\n",
    },
    {
      name: "naive_datetime_to_string/7",
      type: "callback",
      specs: [],
      documentation:
        "Converts the naive datetime (without time zone) into a string according to the calendar.\n",
    },
    {
      name: "naive_datetime_to_iso_days/7",
      type: "callback",
      specs: [],
      documentation:
        "Converts the datetime (without time zone) into the `t:iso_days/0` format.\n",
    },
    {
      name: "naive_datetime_from_iso_days/1",
      type: "callback",
      specs: [],
      documentation:
        "Converts `t:iso_days/0` to the calendar's datetime format.\n",
    },
    {
      name: "months_in_year/1",
      type: "callback",
      specs: [],
      documentation: "Returns how many months there are in the given year.\n",
    },
    {
      name: "leap_year?/1",
      type: "callback",
      specs: [],
      documentation:
        "Returns `true` if the given year is a leap year.\n\nA leap year is a year of a longer length than normal. The exact meaning\nis up to the calendar. A calendar must return `false` if it does not support\nthe concept of leap years.\n",
    },
    {
      name: "iso_days_to_end_of_day/1",
      type: "callback",
      specs: [],
      documentation:
        "Converts the given `t:iso_days/0` to the last moment of the day.\n",
    },
    {
      name: "iso_days_to_beginning_of_day/1",
      type: "callback",
      specs: [],
      documentation:
        "Converts the given `t:iso_days/0` to the first moment of the day.\n",
    },
    {
      name: "days_in_month/2",
      type: "callback",
      specs: [],
      documentation:
        "Returns how many days there are in the given month of the given year.\n",
    },
    {
      name: "day_rollover_relative_to_midnight_utc/0",
      type: "callback",
      specs: [],
      documentation:
        "Define the rollover moment for the calendar.\n\nThis is the moment, in your calendar, when the current day ends\nand the next day starts.\n\nThe result of this function is used to check if two calendars roll over at\nthe same time of day. If they do not, we can only convert datetimes and times\nbetween them. If they do, this means that we can also convert dates as well\nas naive datetimes between them.\n\nThis day fraction should be in its most simplified form possible, to make comparisons fast.\n\n## Examples\n\n  * If in your calendar a new day starts at midnight, return `{0, 1}`.\n  * If in your calendar a new day starts at sunrise, return `{1, 4}`.\n  * If in your calendar a new day starts at noon, return `{1, 2}`.\n  * If in your calendar a new day starts at sunset, return `{3, 4}`.\n\n",
    },
    {
      name: "day_of_year/3",
      type: "callback",
      specs: [],
      documentation:
        "Calculates the day of the year from the given `year`, `month`, and `day`.\n",
    },
    {
      name: "day_of_week/4",
      type: "callback",
      specs: [],
      documentation:
        "Calculates the day of the week from the given `year`, `month`, and `day`.\n\n`starting_on` represents the starting day of the week. All\ncalendars must support at least the `:default` value. They may\nalso support other values representing their days of the week.\n",
    },
    {
      name: "day_of_era/3",
      type: "callback",
      specs: [],
      documentation:
        "Calculates the day and era from the given `year`, `month`, and `day`.\n",
    },
    {
      name: "datetime_to_string/11",
      type: "callback",
      specs: [],
      documentation:
        "Converts the datetime (with time zone) into a string according to the calendar.\n",
    },
    {
      name: "date_to_string/3",
      type: "callback",
      specs: [],
      documentation:
        "Converts the date into a string according to the calendar.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "time_zone_database/0",
      type: "type",
      specs: ["@type time_zone_database() :: module()"],
      documentation:
        "Specifies the time zone database for calendar operations.\n\nMany functions in the `DateTime` module require a time zone database.\nBy default, this module uses the default time zone database returned by\n`Calendar.get_time_zone_database/0`, which defaults to\n`Calendar.UTCOnlyTimeZoneDatabase`. This database only handles `Etc/UTC`\ndatetimes and returns `{:error, :utc_only_time_zone_database}`\nfor any other time zone.\n\nOther time zone databases (including ones provided by packages)\ncan be configured as default either via configuration:\n\n    config :elixir, :time_zone_database, CustomTimeZoneDatabase\n\nor by calling `Calendar.put_time_zone_database/1`.\n\nSee `Calendar.TimeZoneDatabase` for more information on custom\ntime zone databases.\n",
    },
    {
      name: "datetime/0",
      type: "type",
      specs: [
        "@type datetime() :: %{\n        optional(any()) => any(),\n        calendar: calendar(),\n        year: year(),\n        month: month(),\n        day: day(),\n        hour: hour(),\n        minute: minute(),\n        second: second(),\n        microsecond: microsecond(),\n        time_zone: time_zone(),\n        zone_abbr: zone_abbr(),\n        utc_offset: utc_offset(),\n        std_offset: std_offset()\n      }",
      ],
      documentation: "Any map or struct that contains the datetime fields.",
    },
    {
      name: "naive_datetime/0",
      type: "type",
      specs: [
        "@type naive_datetime() :: %{\n        optional(any()) => any(),\n        calendar: calendar(),\n        year: year(),\n        month: month(),\n        day: day(),\n        hour: hour(),\n        minute: minute(),\n        second: second(),\n        microsecond: microsecond()\n      }",
      ],
      documentation:
        "Any map or struct that contains the naive datetime fields.",
    },
    {
      name: "time/0",
      type: "type",
      specs: [
        "@type time() :: %{\n        optional(any()) => any(),\n        hour: hour(),\n        minute: minute(),\n        second: second(),\n        microsecond: microsecond()\n      }",
      ],
      documentation: "Any map or struct that contains the time fields.",
    },
    {
      name: "date/0",
      type: "type",
      specs: [
        "@type date() :: %{\n        optional(any()) => any(),\n        calendar: calendar(),\n        year: year(),\n        month: month(),\n        day: day()\n      }",
      ],
      documentation: "Any map or struct that contains the date fields.",
    },
    {
      name: "std_offset/0",
      type: "type",
      specs: ["@type std_offset() :: integer()"],
      documentation:
        'The time zone standard offset in ISO seconds (typically not zero in summer times).\n\nIt must be added to `t:utc_offset/0` to get the total offset from UTC used for "wall time".\n',
    },
    {
      name: "utc_offset/0",
      type: "type",
      specs: ["@type utc_offset() :: integer()"],
      documentation:
        "The time zone UTC offset in ISO seconds for standard time.\n\nSee also `t:std_offset/0`.\n",
    },
    {
      name: "zone_abbr/0",
      type: "type",
      specs: ["@type zone_abbr() :: String.t()"],
      documentation:
        "The time zone abbreviation (for example, `CET` or `CEST` or `BST`).",
    },
    {
      name: "time_zone/0",
      type: "type",
      specs: ["@type time_zone() :: String.t()"],
      documentation:
        "The time zone ID according to the IANA tz database (for example, `Europe/Zurich`).",
    },
    {
      name: "calendar/0",
      type: "type",
      specs: ["@type calendar() :: module()"],
      documentation: "A calendar implementation.",
    },
    {
      name: "microsecond/0",
      type: "type",
      specs: [
        "@type microsecond() ::\n        {value :: non_neg_integer(), precision :: non_neg_integer()}",
      ],
      documentation:
        "Microseconds with stored precision.\n\nThe precision represents the number of digits that must be used when\nrepresenting the microseconds to external format. If the precision is `0`,\nit means microseconds must be skipped.\n",
    },
    {
      name: "iso_days/0",
      type: "type",
      specs: ["@type iso_days() :: {days :: integer(), day_fraction()}"],
      documentation:
        "The internal date format that is used when converting between calendars.\n\nThis is the number of days including the fractional part that has passed of\nthe last day since `0000-01-01+00:00T00:00.000000` in ISO 8601 notation (also\nknown as *midnight 1 January BC 1* of the proleptic Gregorian calendar).\n",
    },
    {
      name: "day_fraction/0",
      type: "type",
      specs: [
        "@type day_fraction() ::\n        {parts_in_day :: non_neg_integer(), parts_per_day :: pos_integer()}",
      ],
      documentation:
        "The internal time format is used when converting between calendars.\n\nIt represents time as a fraction of a day (starting from midnight).\n`parts_in_day` specifies how much of the day is already passed,\nwhile `parts_per_day` signifies how many parts are there in a day.\n",
    },
    {
      name: "second/0",
      type: "type",
      specs: ["@type second() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "minute/0",
      type: "type",
      specs: ["@type minute() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "hour/0",
      type: "type",
      specs: ["@type hour() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "day_of_era/0",
      type: "type",
      specs: ["@type day_of_era() :: {day :: non_neg_integer(), era()}"],
      documentation: "A tuple representing the `day` and the `era`.\n",
    },
    {
      name: "era/0",
      type: "type",
      specs: ["@type era() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "day_of_week/0",
      type: "type",
      specs: ["@type day_of_week() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "week/0",
      type: "type",
      specs: ["@type week() :: pos_integer()"],
      documentation: null,
    },
    {
      name: "day/0",
      type: "type",
      specs: ["@type day() :: pos_integer()"],
      documentation: null,
    },
    {
      name: "month/0",
      type: "type",
      specs: ["@type month() :: pos_integer()"],
      documentation: null,
    },
    {
      name: "year/0",
      type: "type",
      specs: ["@type year() :: integer()"],
      documentation: null,
    },
  ],
};
