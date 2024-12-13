import type { ModuleDoc } from "../types";

export const DateTime: ModuleDoc = {
  functions: [
    {
      name: "utc_now/2",
      type: "function",
      specs: [
        "@spec utc_now(\n        :native | :microsecond | :millisecond | :second,\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        'Returns the current datetime in UTC, supporting\na specific calendar and precision.\n\nIf you want the current time in Unix seconds,\nuse `System.os_time/1` instead.\n\n## Examples\n\n    iex> datetime = DateTime.utc_now(:microsecond, Calendar.ISO)\n    iex> datetime.time_zone\n    "Etc/UTC"\n\n    iex> datetime = DateTime.utc_now(:second, Calendar.ISO)\n    iex> datetime.microsecond\n    {0, 0}\n\n',
    },
    {
      name: "utc_now/1",
      type: "function",
      specs: [
        "@spec utc_now(\n        Calendar.calendar()\n        | :native\n        | :microsecond\n        | :millisecond\n        | :second\n      ) :: t()",
      ],
      documentation:
        'Returns the current datetime in UTC.\n\nIf you want the current time in Unix seconds,\nuse `System.os_time/1` instead.\n\nYou can also pass a time unit to automatically\ntruncate the resulting datetime. This is available\nsince v1.15.0.\n\nThe default unit if none gets passed is `:native`,\nwhich results on a default resolution of microseconds.\n\n## Examples\n\n    iex> datetime = DateTime.utc_now()\n    iex> datetime.time_zone\n    "Etc/UTC"\n\n    iex> datetime = DateTime.utc_now(:second)\n    iex> datetime.microsecond\n    {0, 0}\n\n',
    },
    {
      name: "truncate/2",
      type: "function",
      specs: [
        "@spec truncate(Calendar.datetime(), :microsecond | :millisecond | :second) ::\n        t()",
      ],
      documentation:
        'Returns the given datetime with the microsecond field truncated to the given\nprecision (`:microsecond`, `:millisecond` or `:second`).\n\nThe given datetime is returned unchanged if it already has lower precision than\nthe given precision.\n\n## Examples\n\n    iex> dt1 = %DateTime{year: 2017, month: 11, day: 7, zone_abbr: "CET",\n    ...>                 hour: 11, minute: 45, second: 18, microsecond: {123456, 6},\n    ...>                 utc_offset: 3600, std_offset: 0, time_zone: "Europe/Paris"}\n    iex> DateTime.truncate(dt1, :microsecond)\n    #DateTime<2017-11-07 11:45:18.123456+01:00 CET Europe/Paris>\n\n    iex> dt2 = %DateTime{year: 2017, month: 11, day: 7, zone_abbr: "CET",\n    ...>                 hour: 11, minute: 45, second: 18, microsecond: {123456, 6},\n    ...>                 utc_offset: 3600, std_offset: 0, time_zone: "Europe/Paris"}\n    iex> DateTime.truncate(dt2, :millisecond)\n    #DateTime<2017-11-07 11:45:18.123+01:00 CET Europe/Paris>\n\n    iex> dt3 = %DateTime{year: 2017, month: 11, day: 7, zone_abbr: "CET",\n    ...>                 hour: 11, minute: 45, second: 18, microsecond: {123456, 6},\n    ...>                 utc_offset: 3600, std_offset: 0, time_zone: "Europe/Paris"}\n    iex> DateTime.truncate(dt3, :second)\n    #DateTime<2017-11-07 11:45:18+01:00 CET Europe/Paris>\n\n',
    },
    {
      name: "to_unix/2",
      type: "function",
      specs: [
        "@spec to_unix(Calendar.datetime(), :native | System.time_unit()) :: integer()",
      ],
      documentation:
        'Converts the given `datetime` to Unix time.\n\nThe `datetime` is expected to be using the ISO calendar\nwith a year greater than or equal to 0.\n\nIt will return the integer with the given unit,\naccording to `System.convert_time_unit/3`.\n\n## Examples\n\n    iex> 1_464_096_368 |> DateTime.from_unix!() |> DateTime.to_unix()\n    1464096368\n\n    iex> dt = %DateTime{calendar: Calendar.ISO, day: 20, hour: 18, microsecond: {273806, 6},\n    ...>                minute: 58, month: 11, second: 19, time_zone: "America/Montevideo",\n    ...>                utc_offset: -10800, std_offset: 3600, year: 2014, zone_abbr: "UYST"}\n    iex> DateTime.to_unix(dt)\n    1416517099\n\n    iex> flamel = %DateTime{calendar: Calendar.ISO, day: 22, hour: 8, microsecond: {527771, 6},\n    ...>                minute: 2, month: 3, second: 25, std_offset: 0, time_zone: "Etc/UTC",\n    ...>                utc_offset: 0, year: 1418, zone_abbr: "UTC"}\n    iex> DateTime.to_unix(flamel)\n    -17412508655\n\n',
    },
    {
      name: "to_time/1",
      type: "function",
      specs: ["@spec to_time(Calendar.datetime()) :: Time.t()"],
      documentation:
        'Converts a `DateTime` into `Time`.\n\nBecause `Time` does not hold date nor time zone information,\ndata will be lost during the conversion.\n\n## Examples\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 1},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.to_time(dt)\n    ~T[23:00:07.0]\n\n',
    },
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(Calendar.datetime()) :: String.t()"],
      documentation:
        'Converts the given `datetime` to a string according to its calendar.\n\n### Examples\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.to_string(dt)\n    "2000-02-29 23:00:07+01:00 CET Europe/Warsaw"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "UTC",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 0, std_offset: 0, time_zone: "Etc/UTC"}\n    iex> DateTime.to_string(dt)\n    "2000-02-29 23:00:07Z"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.to_string(dt)\n    "2000-02-29 23:00:07-04:00 AMT America/Manaus"\n\n    iex> dt = %DateTime{year: -100, month: 12, day: 19, zone_abbr: "CET",\n    ...>                hour: 3, minute: 20, second: 31, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Stockholm"}\n    iex> DateTime.to_string(dt)\n    "-0100-12-19 03:20:31+01:00 CET Europe/Stockholm"\n\n',
    },
    {
      name: "to_naive/1",
      type: "function",
      specs: ["@spec to_naive(Calendar.datetime()) :: NaiveDateTime.t()"],
      documentation:
        'Converts the given `datetime` into a `NaiveDateTime`.\n\nBecause `NaiveDateTime` does not hold time zone information,\nany time zone related data will be lost during the conversion.\n\n## Examples\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 1},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.to_naive(dt)\n    ~N[2000-02-29 23:00:07.0]\n\n',
    },
    {
      name: "to_iso8601/3",
      type: "function",
      specs: [
        "@spec to_iso8601(Calendar.datetime(), :basic | :extended, nil | integer()) ::\n        String.t()",
      ],
      documentation:
        'Converts the given datetime to\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601) format.\n\nBy default, `DateTime.to_iso8601/2` returns datetimes formatted in the "extended"\nformat, for human readability. It also supports the "basic" format through passing the `:basic` option.\n\nOnly supports converting datetimes which are in the ISO calendar,\nattempting to convert datetimes from other calendars will raise.\nYou can also optionally specify an offset for the formatted string.\n\nWARNING: the ISO 8601 datetime format does not contain the time zone nor\nits abbreviation, which means information is lost when converting to such\nformat.\n\n### Examples\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.to_iso8601(dt)\n    "2000-02-29T23:00:07+01:00"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "UTC",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 0, std_offset: 0, time_zone: "Etc/UTC"}\n    iex> DateTime.to_iso8601(dt)\n    "2000-02-29T23:00:07Z"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.to_iso8601(dt, :extended)\n    "2000-02-29T23:00:07-04:00"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.to_iso8601(dt, :basic)\n    "20000229T230007-0400"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.to_iso8601(dt, :extended, 3600)\n    "2000-03-01T04:00:07+01:00"\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.to_iso8601(dt, :extended, 0)\n    "2000-03-01T03:00:07+00:00"\n\n    iex> dt = %DateTime{year: 2000, month: 3, day: 01, zone_abbr: "UTC",\n    ...>                hour: 03, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 0, std_offset: 0, time_zone: "Etc/UTC"}\n    iex> DateTime.to_iso8601(dt, :extended, 0)\n    "2000-03-01T03:00:07Z"\n\n    iex> {:ok, dt, offset} = DateTime.from_iso8601("2000-03-01T03:00:07Z")\n    iex> "2000-03-01T03:00:07Z" = DateTime.to_iso8601(dt, :extended, offset)\n',
    },
    {
      name: "to_gregorian_seconds/1",
      type: "function",
      specs: [
        "@spec to_gregorian_seconds(Calendar.datetime()) ::\n        {integer(), non_neg_integer()}",
      ],
      documentation:
        'Converts a `DateTime` struct to a number of gregorian seconds and microseconds.\n\n## Examples\n\n    iex> dt = %DateTime{year: 0000, month: 1, day: 1, zone_abbr: "UTC",\n    ...>                hour: 0, minute: 0, second: 1, microsecond: {0, 0},\n    ...>                utc_offset: 0, std_offset: 0, time_zone: "Etc/UTC"}\n    iex> DateTime.to_gregorian_seconds(dt)\n    {1, 0}\n\n    iex> dt = %DateTime{year: 2020, month: 5, day: 1, zone_abbr: "UTC",\n    ...>                hour: 0, minute: 26, second: 31, microsecond: {5000, 0},\n    ...>                utc_offset: 0, std_offset: 0, time_zone: "Etc/UTC"}\n    iex> DateTime.to_gregorian_seconds(dt)\n    {63_755_511_991, 5000}\n\n    iex> dt = %DateTime{year: 2020, month: 5, day: 1, zone_abbr: "CET",\n    ...>                hour: 1, minute: 26, second: 31, microsecond: {5000, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.to_gregorian_seconds(dt)\n    {63_755_511_991, 5000}\n\n',
    },
    {
      name: "to_date/1",
      type: "function",
      specs: ["@spec to_date(Calendar.datetime()) :: Date.t()"],
      documentation:
        'Converts a `DateTime` into a `Date`.\n\nBecause `Date` does not hold time nor time zone information,\ndata will be lost during the conversion.\n\n## Examples\n\n    iex> dt = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.to_date(dt)\n    ~D[2000-02-29]\n\n',
    },
    {
      name: "shift_zone!/3",
      type: "function",
      specs: [
        "@spec shift_zone!(t(), Calendar.time_zone(), Calendar.time_zone_database()) ::\n        t()",
      ],
      documentation:
        'Changes the time zone of a `DateTime` or raises on errors.\n\nSee `shift_zone/3` for more information.\n\n## Examples\n\n    iex> DateTime.shift_zone!(~U[2018-07-16 10:00:00Z], "America/Los_Angeles", FakeTimeZoneDatabase)\n    #DateTime<2018-07-16 03:00:00-07:00 PDT America/Los_Angeles>\n\n    iex> DateTime.shift_zone!(~U[2018-07-16 10:00:00Z], "bad timezone", FakeTimeZoneDatabase)\n    ** (ArgumentError) cannot shift ~U[2018-07-16 10:00:00Z] to "bad timezone" time zone, reason: :time_zone_not_found\n\n',
    },
    {
      name: "shift_zone/3",
      type: "function",
      specs: [
        "@spec shift_zone(t(), Calendar.time_zone(), Calendar.time_zone_database()) ::\n        {:ok, t()}\n        | {:error, :time_zone_not_found | :utc_only_time_zone_database}",
      ],
      documentation:
        'Changes the time zone of a `DateTime`.\n\nReturns a `DateTime` for the same point in time, but instead at\nthe time zone provided. It assumes that `DateTime` is valid and\nexists in the given time zone and calendar.\n\nBy default, it uses the default time zone database returned by\n`Calendar.get_time_zone_database/0`, which defaults to\n`Calendar.UTCOnlyTimeZoneDatabase` which only handles "Etc/UTC" datetimes.\nOther time zone databases can be passed as argument or set globally.\nSee the "Time zone database" section in the module docs.\n\n## Examples\n\n    iex> {:ok, pacific_datetime} = DateTime.shift_zone(~U[2018-07-16 10:00:00Z], "America/Los_Angeles", FakeTimeZoneDatabase)\n    iex> pacific_datetime\n    #DateTime<2018-07-16 03:00:00-07:00 PDT America/Los_Angeles>\n\n    iex> DateTime.shift_zone(~U[2018-07-16 10:00:00Z], "bad timezone", FakeTimeZoneDatabase)\n    {:error, :time_zone_not_found}\n\n',
    },
    {
      name: "shift/3",
      type: "function",
      specs: [
        "@spec shift(\n        Calendar.datetime(),\n        Duration.duration(),\n        Calendar.time_zone_database()\n      ) :: t()",
      ],
      documentation:
        'Shifts given `datetime` by `duration` according to its calendar.\n\nAllowed units are: `:year`, `:month`, `:week`, `:day`, `:hour`, `:minute`, `:second`, `:microsecond`.\n\nThis operation is equivalent to shifting the datetime wall clock\n(in other words, the value as someone in that timezone would see\non their watch), then applying the time zone offset to convert it\nto UTC, and finally computing the new timezone in case of shifts.\nThis ensures `shift/3` always returns a valid datetime.\n\nOn the other hand, time zones that observe "Daylight Saving Time"\nor other changes, across summer/winter time will add/remove hours\nfrom the resulting datetime:\n\n    dt = DateTime.new!(~D[2019-03-31], ~T[01:00:00], "Europe/Copenhagen")\n    DateTime.shift(dt, hour: 1)\n    #=> #DateTime<2019-03-31 03:00:00+02:00 CEST Europe/Copenhagen>\n\n    dt = DateTime.new!(~D[2018-11-04], ~T[00:00:00], "America/Los_Angeles")\n    DateTime.shift(dt, hour: 2)\n    #=> #DateTime<2018-11-04 01:00:00-08:00 PST America/Los_Angeles>\n\nIn case you don\'t want these changes to happen automatically or you\nwant to surface time zone conflicts to the user, you can shift\nthe datetime as a naive datetime and then use `from_naive/2`:\n\n    dt |> NaiveDateTime.shift(duration) |> DateTime.from_naive(dt.time_zone)\n\nWhen using the default ISO calendar, durations are collapsed and\napplied in the order of months, then seconds and microseconds:\n\n* when shifting by 1 year and 2 months the date is actually shifted by 14 months\n* weeks, days and smaller units are collapsed into seconds and microseconds\n\nWhen shifting by month, days are rounded down to the nearest valid date.\n\n## Examples\n\n    iex> DateTime.shift(~U[2016-01-01 00:00:00Z], month: 2)\n    ~U[2016-03-01 00:00:00Z]\n    iex> DateTime.shift(~U[2016-01-01 00:00:00Z], year: 1, week: 4)\n    ~U[2017-01-29 00:00:00Z]\n    iex> DateTime.shift(~U[2016-01-01 00:00:00Z], minute: -25)\n    ~U[2015-12-31 23:35:00Z]\n    iex> DateTime.shift(~U[2016-01-01 00:00:00Z], minute: 5, microsecond: {500, 4})\n    ~U[2016-01-01 00:05:00.0005Z]\n\n    # leap years\n    iex> DateTime.shift(~U[2024-02-29 00:00:00Z], year: 1)\n    ~U[2025-02-28 00:00:00Z]\n    iex> DateTime.shift(~U[2024-02-29 00:00:00Z], year: 4)\n    ~U[2028-02-29 00:00:00Z]\n\n    # rounding down\n    iex> DateTime.shift(~U[2015-01-31 00:00:00Z], month: 1)\n    ~U[2015-02-28 00:00:00Z]\n\n',
    },
    {
      name: "now!/2",
      type: "function",
      specs: [
        "@spec now!(Calendar.time_zone(), Calendar.time_zone_database()) :: t()",
      ],
      documentation:
        'Returns the current datetime in the provided time zone or raises on errors\n\nSee `now/2` for more information.\n\n## Examples\n\n    iex> datetime = DateTime.now!("Etc/UTC")\n    iex> datetime.time_zone\n    "Etc/UTC"\n\n    iex> DateTime.now!("Europe/Copenhagen")\n    ** (ArgumentError) cannot get current datetime in "Europe/Copenhagen" time zone, reason: :utc_only_time_zone_database\n\n    iex> DateTime.now!("bad timezone", FakeTimeZoneDatabase)\n    ** (ArgumentError) cannot get current datetime in "bad timezone" time zone, reason: :time_zone_not_found\n\n',
    },
    {
      name: "now/2",
      type: "function",
      specs: [
        "@spec now(Calendar.time_zone(), Calendar.time_zone_database()) ::\n        {:ok, t()}\n        | {:error, :time_zone_not_found | :utc_only_time_zone_database}",
      ],
      documentation:
        'Returns the current datetime in the provided time zone.\n\nBy default, it uses the default time_zone returned by\n`Calendar.get_time_zone_database/0`, which defaults to\n`Calendar.UTCOnlyTimeZoneDatabase` which only handles "Etc/UTC" datetimes.\nOther time zone databases can be passed as argument or set globally.\nSee the "Time zone database" section in the module docs.\n\n## Examples\n\n    iex> {:ok, datetime} = DateTime.now("Etc/UTC")\n    iex> datetime.time_zone\n    "Etc/UTC"\n\n    iex> DateTime.now("Europe/Copenhagen")\n    {:error, :utc_only_time_zone_database}\n\n    iex> DateTime.now("bad timezone", FakeTimeZoneDatabase)\n    {:error, :time_zone_not_found}\n\n',
    },
    {
      name: "new!/4",
      type: "function",
      specs: [
        "@spec new!(\n        Date.t(),\n        Time.t(),\n        Calendar.time_zone(),\n        Calendar.time_zone_database()\n      ) :: t()",
      ],
      documentation:
        'Builds a datetime from date and time structs, raising on errors.\n\nIt expects a time zone to put the `DateTime` in.\nIf the time zone is not passed it will default to `"Etc/UTC"`,\nwhich always succeeds. Otherwise, the DateTime is checked against the time zone database\ngiven as `time_zone_database`. See the "Time zone database"\nsection in the module documentation.\n\n## Examples\n\n    iex> DateTime.new!(~D[2016-05-24], ~T[13:26:08.003], "Etc/UTC")\n    ~U[2016-05-24 13:26:08.003Z]\n\nWhen the datetime is ambiguous - for instance during changing from summer\nto winter time - an error will be raised.\n\n    iex> DateTime.new!(~D[2018-10-28], ~T[02:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    ** (ArgumentError) cannot build datetime with ~D[2018-10-28] and ~T[02:30:00] because such instant is ambiguous in time zone Europe/Copenhagen as there is an overlap between #DateTime<2018-10-28 02:30:00+02:00 CEST Europe/Copenhagen> and #DateTime<2018-10-28 02:30:00+01:00 CET Europe/Copenhagen>\n\nWhen there is a gap in wall time - for instance in spring when the clocks are\nturned forward - an error will be raised.\n\n    iex> DateTime.new!(~D[2019-03-31], ~T[02:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    ** (ArgumentError) cannot build datetime with ~D[2019-03-31] and ~T[02:30:00] because such instant does not exist in time zone Europe/Copenhagen as there is a gap between #DateTime<2019-03-31 01:59:59.999999+01:00 CET Europe/Copenhagen> and #DateTime<2019-03-31 03:00:00+02:00 CEST Europe/Copenhagen>\n\nMost of the time there is one, and just one, valid datetime for a certain\ndate and time in a certain time zone.\n\n    iex> datetime = DateTime.new!(~D[2018-07-28], ~T[12:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> datetime\n    #DateTime<2018-07-28 12:30:00+02:00 CEST Europe/Copenhagen>\n\n',
    },
    {
      name: "new/4",
      type: "function",
      specs: [
        "@spec new(\n        Date.t(),\n        Time.t(),\n        Calendar.time_zone(),\n        Calendar.time_zone_database()\n      ) ::\n        {:ok, t()}\n        | {:ambiguous, first_datetime :: t(), second_datetime :: t()}\n        | {:gap, t(), t()}\n        | {:error,\n           :incompatible_calendars\n           | :time_zone_not_found\n           | :utc_only_time_zone_database}",
      ],
      documentation:
        'Builds a datetime from date and time structs.\n\nIt expects a time zone to put the `DateTime` in.\nIf the time zone is not passed it will default to `"Etc/UTC"`,\nwhich always succeeds. Otherwise, the `DateTime` is checked against the time zone database\ngiven as `time_zone_database`. See the "Time zone database"\nsection in the module documentation.\n\n## Examples\n\n    iex> DateTime.new(~D[2016-05-24], ~T[13:26:08.003], "Etc/UTC")\n    {:ok, ~U[2016-05-24 13:26:08.003Z]}\n\nWhen the datetime is ambiguous - for instance during changing from summer\nto winter time - the two possible valid datetimes are returned in a tuple.\nThe first datetime is also the one which comes first chronologically, while\nthe second one comes last.\n\n    iex> {:ambiguous, first_dt, second_dt} = DateTime.new(~D[2018-10-28], ~T[02:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> first_dt\n    #DateTime<2018-10-28 02:30:00+02:00 CEST Europe/Copenhagen>\n    iex> second_dt\n    #DateTime<2018-10-28 02:30:00+01:00 CET Europe/Copenhagen>\n\nWhen there is a gap in wall time - for instance in spring when the clocks are\nturned forward - the latest valid datetime just before the gap and the first\nvalid datetime just after the gap.\n\n    iex> {:gap, just_before, just_after} = DateTime.new(~D[2019-03-31], ~T[02:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> just_before\n    #DateTime<2019-03-31 01:59:59.999999+01:00 CET Europe/Copenhagen>\n    iex> just_after\n    #DateTime<2019-03-31 03:00:00+02:00 CEST Europe/Copenhagen>\n\nMost of the time there is one, and just one, valid datetime for a certain\ndate and time in a certain time zone.\n\n    iex> {:ok, datetime} = DateTime.new(~D[2018-07-28], ~T[12:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> datetime\n    #DateTime<2018-07-28 12:30:00+02:00 CEST Europe/Copenhagen>\n\n',
    },
    {
      name: "from_unix!/3",
      type: "function",
      specs: [
        "@spec from_unix!(integer(), :native | System.time_unit(), Calendar.calendar()) ::\n        t()",
      ],
      documentation:
        "Converts the given Unix time to `DateTime`.\n\nThe integer can be given in different unit\naccording to `System.convert_time_unit/3` and it will\nbe converted to microseconds internally.\n\nUnix times are always in UTC and therefore the DateTime\nwill be returned in UTC.\n\n## Examples\n\n    # An easy way to get the Unix epoch is passing 0 to this function\n    iex> DateTime.from_unix!(0)\n    ~U[1970-01-01 00:00:00Z]\n\n    iex> DateTime.from_unix!(1_464_096_368)\n    ~U[2016-05-24 13:26:08Z]\n\n    iex> DateTime.from_unix!(1_432_560_368_868_569, :microsecond)\n    ~U[2015-05-25 13:26:08.868569Z]\n\n    iex> DateTime.from_unix!(143_256_036_886_856, 1024)\n    ~U[6403-03-17 07:05:22.320312Z]\n\n",
    },
    {
      name: "from_unix/3",
      type: "function",
      specs: [
        "@spec from_unix(integer(), :native | System.time_unit(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, atom()}",
      ],
      documentation:
        "Converts the given Unix time to `DateTime`.\n\nThe integer can be given in different unit\naccording to `System.convert_time_unit/3` and it will\nbe converted to microseconds internally. Up to\n253402300799 seconds is supported.\n\nUnix times are always in UTC and therefore the DateTime\nwill be returned in UTC.\n\n## Examples\n\n    iex> {:ok, datetime} = DateTime.from_unix(1_464_096_368)\n    iex> datetime\n    ~U[2016-05-24 13:26:08Z]\n\n    iex> {:ok, datetime} = DateTime.from_unix(1_432_560_368_868_569, :microsecond)\n    iex> datetime\n    ~U[2015-05-25 13:26:08.868569Z]\n\n    iex> {:ok, datetime} = DateTime.from_unix(253_402_300_799)\n    iex> datetime\n    ~U[9999-12-31 23:59:59Z]\n\n    iex> {:error, :invalid_unix_time} = DateTime.from_unix(253_402_300_800)\n\nThe unit can also be an integer as in `t:System.time_unit/0`:\n\n    iex> {:ok, datetime} = DateTime.from_unix(143_256_036_886_856, 1024)\n    iex> datetime\n    ~U[6403-03-17 07:05:22.320312Z]\n\nNegative Unix times are supported up to -377705116800 seconds:\n\n    iex> {:ok, datetime} = DateTime.from_unix(-377_705_116_800)\n    iex> datetime\n    ~U[-9999-01-01 00:00:00Z]\n\n    iex> {:error, :invalid_unix_time} = DateTime.from_unix(-377_705_116_801)\n\n",
    },
    {
      name: "from_naive!/3",
      type: "function",
      specs: [
        "@spec from_naive!(\n        NaiveDateTime.t(),\n        Calendar.time_zone(),\n        Calendar.time_zone_database()\n      ) :: t()",
      ],
      documentation:
        'Converts the given `NaiveDateTime` to `DateTime`.\n\nIt expects a time zone to put the NaiveDateTime in.\nIf the time zone is "Etc/UTC", it always succeeds. Otherwise,\nthe NaiveDateTime is checked against the time zone database\ngiven as `time_zone_database`. See the "Time zone database"\nsection in the module documentation.\n\n## Examples\n\n    iex> DateTime.from_naive!(~N[2016-05-24 13:26:08.003], "Etc/UTC")\n    ~U[2016-05-24 13:26:08.003Z]\n\n    iex> DateTime.from_naive!(~N[2018-05-24 13:26:08.003], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    #DateTime<2018-05-24 13:26:08.003+02:00 CEST Europe/Copenhagen>\n\n',
    },
    {
      name: "from_naive/3",
      type: "function",
      specs: [
        "@spec from_naive(\n        Calendar.naive_datetime(),\n        Calendar.time_zone(),\n        Calendar.time_zone_database()\n      ) ::\n        {:ok, t()}\n        | {:ambiguous, first_datetime :: t(), second_datetime :: t()}\n        | {:gap, t(), t()}\n        | {:error,\n           :incompatible_calendars\n           | :time_zone_not_found\n           | :utc_only_time_zone_database}",
      ],
      documentation:
        'Converts the given `NaiveDateTime` to `DateTime`.\n\nIt expects a time zone to put the `NaiveDateTime` in.\nIf the time zone is "Etc/UTC", it always succeeds. Otherwise,\nthe NaiveDateTime is checked against the time zone database\ngiven as `time_zone_database`. See the "Time zone database"\nsection in the module documentation.\n\n## Examples\n\n    iex> DateTime.from_naive(~N[2016-05-24 13:26:08.003], "Etc/UTC")\n    {:ok, ~U[2016-05-24 13:26:08.003Z]}\n\nWhen the datetime is ambiguous - for instance during changing from summer\nto winter time - the two possible valid datetimes are returned in a tuple.\nThe first datetime is also the one which comes first chronologically, while\nthe second one comes last.\n\n    iex> {:ambiguous, first_dt, second_dt} = DateTime.from_naive(~N[2018-10-28 02:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> first_dt\n    #DateTime<2018-10-28 02:30:00+02:00 CEST Europe/Copenhagen>\n    iex> second_dt\n    #DateTime<2018-10-28 02:30:00+01:00 CET Europe/Copenhagen>\n\nWhen there is a gap in wall time - for instance in spring when the clocks are\nturned forward - the latest valid datetime just before the gap and the first\nvalid datetime just after the gap.\n\n    iex> {:gap, just_before, just_after} = DateTime.from_naive(~N[2019-03-31 02:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> just_before\n    #DateTime<2019-03-31 01:59:59.999999+01:00 CET Europe/Copenhagen>\n    iex> just_after\n    #DateTime<2019-03-31 03:00:00+02:00 CEST Europe/Copenhagen>\n\nMost of the time there is one, and just one, valid datetime for a certain\ndate and time in a certain time zone.\n\n    iex> {:ok, datetime} = DateTime.from_naive(~N[2018-07-28 12:30:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> datetime\n    #DateTime<2018-07-28 12:30:00+02:00 CEST Europe/Copenhagen>\n\nThis function accepts any map or struct that contains at least the same fields as a `NaiveDateTime`\nstruct. The most common example of that is a `DateTime`. In this case the information about the time\nzone of that `DateTime` is completely ignored. This is the same principle as passing a `DateTime` to\n`Date.to_iso8601/2`. `Date.to_iso8601/2` extracts only the date-specific fields (calendar, year,\nmonth and day) of the given structure and ignores all others.\n\nThis way if you have a `DateTime` in one time zone, you can get the same wall time in another time zone.\nFor instance if you have 2018-08-24 10:00:00 in Copenhagen and want a `DateTime` for 2018-08-24 10:00:00\nin UTC you can do:\n\n    iex> cph_datetime = DateTime.from_naive!(~N[2018-08-24 10:00:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> {:ok, utc_datetime} = DateTime.from_naive(cph_datetime, "Etc/UTC", FakeTimeZoneDatabase)\n    iex> utc_datetime\n    ~U[2018-08-24 10:00:00Z]\n\nIf instead you want a `DateTime` for the same point time in a different time zone see the\n`DateTime.shift_zone/3` function which would convert 2018-08-24 10:00:00 in Copenhagen\nto 2018-08-24 08:00:00 in UTC.\n',
    },
    {
      name: "from_iso8601/3",
      type: "function",
      specs: [
        "@spec from_iso8601(String.t(), Calendar.calendar(), :extended | :basic) ::\n        {:ok, t(), Calendar.utc_offset()} | {:error, atom()}",
      ],
      documentation:
        'Converts from ISO8601 specifying both a calendar and a mode.\n\nSee `from_iso8601/2` for more information.\n\n## Examples\n\n    iex> {:ok, datetime, 9000} = DateTime.from_iso8601("2015-01-23T23:50:07,123+02:30", Calendar.ISO, :extended)\n    iex> datetime\n    ~U[2015-01-23 21:20:07.123Z]\n\n    iex> {:ok, datetime, 9000} = DateTime.from_iso8601("20150123T235007.123+0230", Calendar.ISO, :basic)\n    iex> datetime\n    ~U[2015-01-23 21:20:07.123Z]\n\n',
    },
    {
      name: "from_iso8601/2",
      type: "function",
      specs: [
        "@spec from_iso8601(String.t(), Calendar.calendar() | :extended | :basic) ::\n        {:ok, t(), Calendar.utc_offset()} | {:error, atom()}",
      ],
      documentation:
        'Parses the extended "Date and time of day" format described by\n[ISO 8601:2019](https://en.wikipedia.org/wiki/ISO_8601).\n\nSince ISO 8601 does not include the proper time zone, the given\nstring will be converted to UTC and its offset in seconds will be\nreturned as part of this function. Therefore offset information\nmust be present in the string.\n\nAs specified in the standard, the separator "T" may be omitted if\ndesired as there is no ambiguity within this function.\n\nNote leap seconds are not supported by the built-in Calendar.ISO.\n\n## Examples\n\n    iex> {:ok, datetime, 0} = DateTime.from_iso8601("2015-01-23T23:50:07Z")\n    iex> datetime\n    ~U[2015-01-23 23:50:07Z]\n\n    iex> {:ok, datetime, 9000} = DateTime.from_iso8601("2015-01-23T23:50:07.123+02:30")\n    iex> datetime\n    ~U[2015-01-23 21:20:07.123Z]\n\n    iex> {:ok, datetime, 9000} = DateTime.from_iso8601("2015-01-23T23:50:07,123+02:30")\n    iex> datetime\n    ~U[2015-01-23 21:20:07.123Z]\n\n    iex> {:ok, datetime, 0} = DateTime.from_iso8601("-2015-01-23T23:50:07Z")\n    iex> datetime\n    ~U[-2015-01-23 23:50:07Z]\n\n    iex> {:ok, datetime, 9000} = DateTime.from_iso8601("-2015-01-23T23:50:07,123+02:30")\n    iex> datetime\n    ~U[-2015-01-23 21:20:07.123Z]\n\n    iex> {:ok, datetime, 9000} = DateTime.from_iso8601("20150123T235007.123+0230", :basic)\n    iex> datetime\n    ~U[2015-01-23 21:20:07.123Z]\n\n    iex> DateTime.from_iso8601("2015-01-23P23:50:07")\n    {:error, :invalid_format}\n    iex> DateTime.from_iso8601("2015-01-23T23:50:07")\n    {:error, :missing_offset}\n    iex> DateTime.from_iso8601("2015-01-23 23:50:61")\n    {:error, :invalid_time}\n    iex> DateTime.from_iso8601("2015-01-32 23:50:07")\n    {:error, :invalid_date}\n    iex> DateTime.from_iso8601("2015-01-23T23:50:07.123-00:00")\n    {:error, :invalid_format}\n\n',
    },
    {
      name: "from_gregorian_seconds/3",
      type: "function",
      specs: [
        "@spec from_gregorian_seconds(\n        integer(),\n        Calendar.microsecond(),\n        Calendar.calendar()\n      ) :: t()",
      ],
      documentation:
        "Converts a number of gregorian seconds to a `DateTime` struct.\n\nThe returned `DateTime` will have `UTC` timezone, if you want other timezone, please use\n`DateTime.shift_zone/3`.\n\n## Examples\n\n    iex> DateTime.from_gregorian_seconds(1)\n    ~U[0000-01-01 00:00:01Z]\n    iex> DateTime.from_gregorian_seconds(63_755_511_991, {5000, 3})\n    ~U[2020-05-01 00:26:31.005Z]\n    iex> DateTime.from_gregorian_seconds(-1)\n    ~U[-0001-12-31 23:59:59Z]\n\n",
    },
    {
      name: "diff/3",
      type: "function",
      specs: [
        "@spec diff(\n        Calendar.datetime(),\n        Calendar.datetime(),\n        :day | :hour | :minute | System.time_unit()\n      ) :: integer()",
      ],
      documentation:
        'Subtracts `datetime2` from `datetime1`.\n\nThe answer can be returned in any `:day`, `:hour`, `:minute`, or any `unit`\navailable from `t:System.time_unit/0`. The unit is measured according to\n`Calendar.ISO` and defaults to `:second`.\n\nFractional results are not supported and are truncated.\n\n## Examples\n\n    iex> DateTime.diff(~U[2024-01-15 10:00:10Z], ~U[2024-01-15 10:00:00Z])\n    10\n\nThis function also considers timezone offsets:\n\n    iex> dt1 = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                 hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                 utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> dt2 = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                 hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                 utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.diff(dt1, dt2)\n    18000\n    iex> DateTime.diff(dt2, dt1)\n    -18000\n    iex> DateTime.diff(dt1, dt2, :hour)\n    5\n    iex> DateTime.diff(dt2, dt1, :hour)\n    -5\n\n',
    },
    {
      name: "convert!/2",
      type: "function",
      specs: [
        "@spec convert!(Calendar.datetime(), Calendar.calendar()) :: t()",
      ],
      documentation:
        'Converts a given `datetime` from one calendar to another.\n\nIf it is not possible to convert unambiguously between the calendars\n(see `Calendar.compatible_calendars?/2`), an ArgumentError is raised.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> dt1 = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                 hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                 utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.convert!(dt1, Calendar.Holocene)\n    %DateTime{calendar: Calendar.Holocene, day: 29, hour: 23,\n              microsecond: {0, 0}, minute: 0, month: 2, second: 7, std_offset: 0,\n              time_zone: "America/Manaus", utc_offset: -14400, year: 12000,\n              zone_abbr: "AMT"}\n\n',
    },
    {
      name: "convert/2",
      type: "function",
      specs: [
        "@spec convert(Calendar.datetime(), Calendar.calendar()) ::\n        {:ok, t()} | {:error, :incompatible_calendars}",
      ],
      documentation:
        'Converts a given `datetime` from one calendar to another.\n\nIf it is not possible to convert unambiguously between the calendars\n(see `Calendar.compatible_calendars?/2`), an `{:error, :incompatible_calendars}` tuple\nis returned.\n\n## Examples\n\nImagine someone implements `Calendar.Holocene`, a calendar based on the\nGregorian calendar that adds exactly 10,000 years to the current Gregorian\nyear:\n\n    iex> dt1 = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                 hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                 utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> DateTime.convert(dt1, Calendar.Holocene)\n    {:ok, %DateTime{calendar: Calendar.Holocene, day: 29, hour: 23,\n                    microsecond: {0, 0}, minute: 0, month: 2, second: 7, std_offset: 0,\n                    time_zone: "America/Manaus", utc_offset: -14400, year: 12000,\n                    zone_abbr: "AMT"}}\n\n',
    },
    {
      name: "compare/2",
      type: "function",
      specs: [
        "@spec compare(Calendar.datetime(), Calendar.datetime()) :: :lt | :eq | :gt",
      ],
      documentation:
        'Compares two datetime structs.\n\nReturns `:gt` if the first datetime is later than the second\nand `:lt` for vice versa. If the two datetimes are equal\n`:eq` is returned.\n\nNote that both UTC and Standard offsets will be taken into\naccount when comparison is done.\n\n## Examples\n\n    iex> dt1 = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "AMT",\n    ...>                 hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                 utc_offset: -14400, std_offset: 0, time_zone: "America/Manaus"}\n    iex> dt2 = %DateTime{year: 2000, month: 2, day: 29, zone_abbr: "CET",\n    ...>                 hour: 23, minute: 0, second: 7, microsecond: {0, 0},\n    ...>                 utc_offset: 3600, std_offset: 0, time_zone: "Europe/Warsaw"}\n    iex> DateTime.compare(dt1, dt2)\n    :gt\n\n',
    },
    {
      name: "before?/2",
      type: "function",
      specs: [
        "@spec before?(Calendar.datetime(), Calendar.datetime()) :: boolean()",
      ],
      documentation:
        "Returns `true` if the first datetime is strictly earlier than the second.\n\n## Examples\n\n    iex> DateTime.before?(~U[2021-01-01 11:00:00Z], ~U[2022-02-02 11:00:00Z])\n    true\n    iex> DateTime.before?(~U[2021-01-01 11:00:00Z], ~U[2021-01-01 11:00:00Z])\n    false\n    iex> DateTime.before?(~U[2022-02-02 11:00:00Z], ~U[2021-01-01 11:00:00Z])\n    false\n\n",
    },
    {
      name: "after?/2",
      type: "function",
      specs: [
        "@spec after?(Calendar.datetime(), Calendar.datetime()) :: boolean()",
      ],
      documentation:
        "Returns `true` if the first datetime is strictly later than the second.\n\n## Examples\n\n    iex> DateTime.after?(~U[2022-02-02 11:00:00Z], ~U[2021-01-01 11:00:00Z])\n    true\n    iex> DateTime.after?(~U[2021-01-01 11:00:00Z], ~U[2021-01-01 11:00:00Z])\n    false\n    iex> DateTime.after?(~U[2021-01-01 11:00:00Z], ~U[2022-02-02 11:00:00Z])\n    false\n\n",
    },
    {
      name: "add/4",
      type: "function",
      specs: [
        "@spec add(\n        Calendar.datetime(),\n        integer(),\n        :day | :hour | :minute | System.time_unit(),\n        Calendar.time_zone_database()\n      ) :: t()",
      ],
      documentation:
        'Adds a specified amount of time to a `DateTime`.\n\nAccepts an `amount_to_add` in any `unit`. `unit` can be `:day`,\n`:hour`, `:minute`, `:second` or any subsecond precision from\n`t:System.time_unit/0`. It defaults to `:second`. Negative values\nwill move backwards in time.\n\nThis function always considers the unit to be computed according\nto the `Calendar.ISO`.\n\nThis function relies on a contiguous representation of time,\nignoring the wall time and timezone changes. For example, if you add\none day when there are summer time/daylight saving time changes,\nit will also change the time forward or backward by one hour,\nso the elapsed time is precisely 24 hours. Similarly, adding just\na few seconds to a datetime just before "spring forward" can cause\nwall time to increase by more than an hour.\n\nWhile this means this function is precise in terms of elapsed time,\nits result may be misleading in certain use cases. For example, if a\nuser requests a meeting to happen every day at 15:00 and you use this\nfunction to compute all future meetings by adding day after day, this\nfunction may change the meeting time to 14:00 or 16:00 if there are\nchanges to the current timezone. Computing of recurring datetimes is\nnot currently supported in Elixir\'s standard library but it is available\nby third-party libraries.\n\n### Examples\n\n    iex> dt = DateTime.from_naive!(~N[2018-11-15 10:00:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> dt |> DateTime.add(3600, :second, FakeTimeZoneDatabase)\n    #DateTime<2018-11-15 11:00:00+01:00 CET Europe/Copenhagen>\n\n    iex> DateTime.add(~U[2018-11-15 10:00:00Z], 3600, :second)\n    ~U[2018-11-15 11:00:00Z]\n\nWhen adding 3 seconds just before "spring forward" we go from 1:59:59 to 3:00:02:\n\n    iex> dt = DateTime.from_naive!(~N[2019-03-31 01:59:59.123], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> dt |> DateTime.add(3, :second, FakeTimeZoneDatabase)\n    #DateTime<2019-03-31 03:00:02.123+02:00 CEST Europe/Copenhagen>\n\nWhen adding 1 day during "spring forward", the hour also changes:\n\n    iex> dt = DateTime.from_naive!(~N[2019-03-31 01:00:00], "Europe/Copenhagen", FakeTimeZoneDatabase)\n    iex> dt |> DateTime.add(1, :day, FakeTimeZoneDatabase)\n    #DateTime<2019-04-01 02:00:00+02:00 CEST Europe/Copenhagen>\n\nThis operation merges the precision of the naive date time with the given unit:\n\n    iex> result = DateTime.add(~U[2014-10-02 00:29:10Z], 21, :millisecond)\n    ~U[2014-10-02 00:29:10.021Z]\n    iex> result.microsecond\n    {21000, 3}\n\nTo shift a datetime by a `Duration` and according to its underlying calendar, use `DateTime.shift/3`.\n\n',
    },
  ],
  name: "DateTime",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %DateTime{\n        calendar: Calendar.calendar(),\n        day: Calendar.day(),\n        hour: Calendar.hour(),\n        microsecond: Calendar.microsecond(),\n        minute: Calendar.minute(),\n        month: Calendar.month(),\n        second: Calendar.second(),\n        std_offset: Calendar.std_offset(),\n        time_zone: Calendar.time_zone(),\n        utc_offset: Calendar.utc_offset(),\n        year: Calendar.year(),\n        zone_abbr: Calendar.zone_abbr()\n      }",
      ],
      documentation: null,
    },
  ],
};
