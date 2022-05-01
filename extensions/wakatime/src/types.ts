export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace WakaTime {
    export interface User {
      data: {
        id: string;
        has_premium_features: boolean;
        display_name: string;
        full_name: string;
        email: string;
        photo: string;
        is_email_public: boolean;
        is_email_confirmed: boolean;
        public_email: string;
        photo_public: boolean;
        timezone: string;
        last_heartbeat_at: string;
        last_plugin: string;
        last_plugin_name: string;
        last_project: string;
        plan: string;
        username: string;
        website: string;
        human_readable_website: string;
        city: Record<"country_code" | "name" | "state" | "title", string>;
        logged_time_public: boolean;
        languages_used_public: boolean;
        is_hireable: boolean;
        profile_url: string;
        created_at: string;
        modified_at: string;
      };
    }

    export interface Stats {
      data: Record<
        | "range"
        | "human_readable_daily_average"
        | "human_readable_total"
        | "status"
        | "start"
        | "end"
        | "timezone"
        | "user_id"
        | "username"
        | "created_at"
        | "modified_at",
        string
      > & {
        categories: Array<Omit<StatProperty, "seconds">>;
        projects: Array<Omit<StatProperty, "seconds">>;
        languages: Array<StatProperty>;
        editors: Array<StatProperty>;
        operating_systems: Array<StatProperty>;
        dependencies: Array<StatProperty>;
        machines: Array<StatProperty & { machine_name_id: string }>;
        best_day: Record<"date" | "text", string> & Record<"total_seconds", number>;
      } & Record<
          | "is_already_updating"
          | "is_coding_activity_visible"
          | "is_other_usage_visible"
          | "is_stuck"
          | "is_including_today"
          | "is_up_to_date"
          | "writes_only",
          boolean
        > &
        Record<
          | "holidays"
          | "daily_average"
          | "days_including_holidays"
          | "days_minus_holidays"
          | "timeout"
          | "total_seconds",
          number
        >;
    }

    type StatProperty = Record<"digital" | "name" | "text", string> &
      Record<"hours" | "minutes" | "percent" | "seconds" | "total_seconds", number>;
  }
}
