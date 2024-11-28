import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { getUser } from "../api";

interface User {
  id: number;
  joined_time: Date;
  started_event: number;
  favourite_team: number;
  player_first_name: string;
  player_last_name: string;
  player_region_id: number;
  player_region_name: string;
  player_region_iso_code_short: string;
  player_region_iso_code_long: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  leagues: Leagues;
  name: string;
  name_change_blocked: boolean;
  kit: string;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
}

interface Leagues {
  classic: Classic[];
  h2h: unknown[];
  cup: Cup;
  cup_matches: unknown[];
}

interface Cup {
  matches: unknown[];
  cup_league?: unknown;
}

interface Classic {
  id: number;
  name: string;
  short_name: string;
  created: Date;
  closed: boolean;
  rank?: unknown;
  max_entries?: unknown;
  league_type: string;
  scoring: string;
  admin_entry?: number;
  start_event: number;
  entry_can_leave: boolean;
  entry_can_admin: boolean;
  entry_can_invite: boolean;
  has_cup: boolean;
  cup_league?: unknown;
  cup_qualified?: unknown;
  entry_rank: number;
  entry_last_rank: number;
}

const cache = new Cache({
  capacity: 1024 * 1024,
});

const useUser = (id: string) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      const today = new Date();
      const todayDayMonth = `${today.getDate()}=${today.getMonth()}`;

      const cachedData = cache.get(`user-${id}-${todayDayMonth}`);
      if (cachedData) {
        const cachedUser = JSON.parse(cachedData);
        setUser(cachedUser);
      } else {
        getUser(id).then((data) => {
          setUser(data);
          cache.set(`user-${id}-${todayDayMonth}`, JSON.stringify(data));
        });
      }
    }
  }, [id]);

  return user;
};

export default useUser;
