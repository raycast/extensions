import type { KNOWN_RANGES } from "./utils";

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace WakaTime {
    export type KNOWN_RANGE = keyof typeof KNOWN_RANGES;

    interface User {
      data: {
        /** unique id of user */
        id: string;
        /** true if user has access to premium features */
        has_premium_features: boolean;
        /** display name of this user taken from full_name or @username. Defaults to 'Anonymous User' */
        display_name: string;
        /** full name of user */
        full_name: string;
        /** email address */
        email: string;
        /** url of photo for this user */
        photo: string;
        /** whether this user's email should be shown on the public leader board */
        is_email_public: boolean;
        /** whether this user's email address has been verified with a confirmation email */
        is_email_confirmed: boolean;
        /** email address for public profile. Nullable. */
        public_email: string;
        /** whether this user's photo should be shown on the public leader board */
        photo_public: boolean;
        /** user's timezone in Country/Region format */
        timezone: string | null;
        /** time of most recent heartbeat received in ISO 8601 format */
        last_heartbeat_at: string;
        /** user-agent string from the last plugin used */
        last_plugin: string;
        /** name of editor last used */
        last_plugin_name: string;
        /** name of last project coded in */
        last_project: string;
        /** users subscription plan */
        plan: string;
        /** users public username */
        username: string;
        /** website of user */
        website: string;
        /** website of user without protocol part */
        human_readable_website: string;
        city: {
          /** two letter code, for ex: US or UK */
          country_code: string;
          /** city name, for ex: San Francisco */
          name: string;
          /** state name, for ex: California */
          state: string;
          /** city, state (or country if state has same name as city) */
          title: string;
        };
        /** coding activity should be shown on the public leader board */
        logged_time_public: boolean;
        /** languages used should be shown on the public leader board */
        languages_used_public: boolean;
        /** user preference showing hireable badge on public profile */
        is_hireable: boolean;
        /** time when user was created in ISO 8601 format */
        created_at: string;
        /** time when user was last modified in ISO 8601 format */
        modified_at: string;
        profile_url: string;
      };
    }

    interface Summary {
      /** start of time range as ISO 8601 UTC datetime */
      start: string;
      /** end of time range as ISO 8601 UTC datetime */
      end: string;
      data: Array<{
        grand_total: Omit<SummaryStat, "percent" | "seconds" | "name">;
        categories: Array<Omit<SummaryStat, "seconds">>;
        projects: Array<Omit<SummaryStat, "seconds">>;
        languages: Array<SummaryStat>;
        editors: Array<SummaryStat>;
        operating_systems: Array<SummaryStat>;
        dependencies: Array<SummaryStat>;
        machines: Array<
          {
            /** unique id of this machine */
            machine_name_id: string;
          } & SummaryStat
        >;
        /** included only when project url parameter used */
        branches?: Array<SummaryStat>;
        /** included only when project url parameter used */
        entities?: Array<SummaryStat>;
        range: {
          /** this day as Date string in YEAR-MONTH-DAY format */
          date: string;
          /** start of this day as ISO 8601 UTC datetime */
          start: string;
          /** end of this day as ISO 8601 UTC datetime */
          end: string;
          /** this day in human-readable format relative to the current day */
          text: string;
          /** timezone used in Olson Country/Region format */
          timezone: string;
        };
      }>;
      cumulative_total: {
        /** cumulative number of seconds over the date range of summaries */
        seconds: number;
        /** cumulative total coding activity in human readable format */
        text: string;
      };
    }

    interface SummaryStat {
      /** branch name */
      name: string;
      /** total coding activity spent in this branch as seconds */
      total_seconds: number;
      /** percent of time spent in this branch */
      percent: number;
      /** total coding activity for this branch in digital clock format */
      digital: string;
      /** total coding activity in human readable format */
      text: string;
      /** hours portion of coding activity for this branch */
      hours: number;
      /** minutes portion of coding activity for this branch */
      minutes: number;
      /** seconds portion of coding activity for this branch */
      seconds: number;
    }

    interface LeaderBoard {
      /** current page number */
      page: number;
      /** number of pages available */
      total_pages: number;
      /** keystroke timeout setting in minutes used by this leaderboard */
      timeout: number;
      /** language filter for this leaderboard */
      language: string;
      /** country code filter for this leaderboard */
      country_code: string;
      /** time when this leaderboard was last updated in ISO 8601 format */
      modified_at: string;
      /** hireable filter for this leaderboard */
      is_hireable: boolean;
      /** writes_only setting used by this leaderboard */
      writes_only: boolean;
      current_user: {
        /** rank of the currently authorized user, or null if the current user is not on this leader board */
        rank: number;
        /** page containing the currently authorized user, or null if the current user is not on this leader board */
        page: number;
        user: LeaderBoardUser;
      } | null;
      range: {
        /** start of this range as ISO 8601 UTC datetime */
        start_date: string;
        /** start of range in human-readable format relative to the current day */
        start_text: string;
        /** end of range as ISO 8601 UTC datetime */
        end_date: string;
        /** end of range in human-readable format relative to the current day */
        end_text: string;
        /** time range of this leaderboard */
        name: string;
        /** time range in human-readable format relative to the current day */
        text: string;
      };
      data: Array<{
        /** rank of this leader */
        rank: number;
        user: LeaderBoardUser;
        running_total: {
          /** total coding activity for this user as seconds */
          total_seconds: number;
          /** total coding activity for this user as seconds */
          human_readable_total: string;
          /** total coding activity for this user as seconds */
          daily_average: number;
          /** total coding activity for this user as seconds */
          human_readable_daily_average: string;
          /** */
          languages: Array<{
            /** language name */
            name: string;
            /** total seconds user has logged in this language */
            total_seconds: number;
          }>;
        };
      }>;
    }

    interface PrivateLeaderBoards {
      data: Array<{
        /** true if user has access to delete this leaderboard */
        can_delete: boolean;
        /** true if user has access to edit this leaderboard */
        can_edit: boolean;
        /** time when leaderboard was created in ISO 8601 format */
        created_at: string;
        /** true if this leaderboard has room for more members */
        has_available_seat: boolean;
        /** unique id of leaderboard */
        id: string;
        /** number of members in this private leaderboard */
        members_count: number;
        /** number of members who have timezones set; when a user does not have a timezone, they will be hidden from leaderboards */
        members_with_timezones_count: number;
        /** time when leaderboard was last modified in ISO 8601 format */
        modified_at: string;
        /** display name */
        name: string;
        /** time range of this leaderboard; always "last_7_days" */
        time_range: string;
      }>;
      /** total number of private leaderboards */
      total: number;
      /** number of pages available */
      total_pages: number;
    }

    interface Projects {
      data: Array<{
        /** unique project id */
        id: string;
        /** project name */
        name: string;
        /** associated repository if connected */
        repository: string | null;
        /** associated project badge if enabled */
        badge: {
          color: string;
          created_at: string;
          id: string;
          left_text: string;
          link: string;
          project_id: string;
          snippets: Array<{ content: string; name: string }>;
          title: string;
          url: string;
        } | null;
        /** custom project color as hex string, or null if using default color */
        color: string | null;
        /** whether this project has a shareable url defined */
        has_public_url: boolean;
        /** time when project last received code stats as human readable string */
        human_readable_last_heartbeat_at: string;
        /** time when project last received code stats in ISO 8601 format */
        last_heartbeat_at: string;
        /** url of this project relative to wakatime.com */
        url: string;
        /** project name url entity encoded */
        created_at: string;
        /** time when project was created in ISO 8601 format>,  */
        urlencoded_name: string;
      }>;
      next_page: number;
      page: number;
      prev_page: number;
      total: number;
      total_pages: number;
    }

    interface LeaderBoardUser {
      /** unique id of user */
      id: string;
      /** email address of user, if public */
      email: string;
      /** users public username */
      username: string;
      /** full name of user */
      full_name: string;
      /** display name of this user taken from full_name or @username. Defaults to 'Anonymous User' */
      display_name: string;
      /** website of user */
      website: string;
      /** website of user without url scheme */
      human_readable_website: string;
      /** represents the “hireable” badge on user profiles */
      is_hireable: boolean;
      city: {
        /** two letter code, for ex: US or UK */
        country_code: string;
        /** city name, for ex: San Francisco */
        name: string;
        /** state name, for ex: California */
        state: string;
        /** city, state (or country if state has same name as city */
        title: string;
      };
      /** whether this user's email should be shown publicly on leader boards */
      is_email_public: boolean;
      /** whether this user's photo should be shown publicly on leader boards */
      photo_public: boolean;
      /** user's public photo */
      photo: string;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Types {
    type RouteData<T> = { error?: never; ok: true; result: T };
    type RouteError = { error: string; ok: false; result?: never };

    type RouteResponse<T> = RouteData<T> | RouteError;
  }
}
