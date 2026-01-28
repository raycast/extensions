import type { ModuleDoc } from "../types";

export const Calendar_TimeZoneDatabase: ModuleDoc = {
  functions: [],
  name: "Calendar.TimeZoneDatabase",
  callbacks: [
    {
      name: "time_zone_periods_from_wall_datetime/2",
      type: "callback",
      specs: [],
      documentation:
        'Possible time zone periods for a certain time zone and wall clock date and time.\n\nWhen the provided naive datetime is ambiguous, return a tuple with `:ambiguous`\nand the two possible periods. The periods in the tuple must be sorted with the\nfirst element being the one that begins first.\n\nWhen the provided naive datetime is in a gap, such as during the "spring forward" when going\nfrom winter time to summer time, return a tuple with `:gap` and two periods with limits\nin a nested tuple. The first nested two-tuple is the period before the gap and a naive datetime\nwith a limit for when the period ends (wall time). The second nested two-tuple is the period\njust after the gap and a datetime (wall time) for when the period begins just after the gap.\n\nIf there is only a single possible period for the provided `datetime`, then return a tuple\nwith `:ok` and the `time_zone_period`.\n',
    },
    {
      name: "time_zone_period_from_utc_iso_days/2",
      type: "callback",
      specs: [],
      documentation:
        "Time zone period for a point in time in UTC for a specific time zone.\n\nTakes a time zone name and a point in time for UTC and returns a\n`time_zone_period` for that point in time.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "time_zone_period_limit/0",
      type: "type",
      specs: ["@type time_zone_period_limit() :: Calendar.naive_datetime()"],
      documentation:
        "Limit for when a certain time zone period begins or ends.\n\nA beginning is inclusive. An ending is exclusive. For example, if a period is from\n`2015-03-29 01:00:00` and until `2015-10-25 01:00:00`, the period includes and\nbegins from the beginning of `2015-03-29 01:00:00` and lasts until just before\n`2015-10-25 01:00:00`.\n\nA beginning or end for certain periods are infinite, such as the latest\nperiod for time zones without DST or plans to change. However, for the purpose\nof this behaviour, they are only used for gaps in wall time where the needed\nperiod limits are at a certain time.\n",
    },
    {
      name: "time_zone_period/0",
      type: "type",
      specs: [
        "@type time_zone_period() :: %{\n        optional(any()) => any(),\n        utc_offset: Calendar.utc_offset(),\n        std_offset: Calendar.std_offset(),\n        zone_abbr: Calendar.zone_abbr()\n      }",
      ],
      documentation:
        "A period where a certain combination of UTC offset, standard offset, and zone\nabbreviation is in effect.\n\nFor example, one period could be the summer of 2018 in the `Europe/London` timezone,\nwhere summer time/daylight saving time is in effect and lasts from spring to autumn.\nIn autumn, the `std_offset` changes along with the `zone_abbr` so a different\nperiod is needed during winter.\n",
    },
  ],
};
