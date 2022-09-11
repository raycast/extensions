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
  h2h: any[];
  cup: Cup;
  cup_matches: any[];
}

interface Cup {
  matches: any[];
  cup_league?: any;
}

interface Classic {
  id: number;
  name: string;
  short_name: string;
  created: Date;
  closed: boolean;
  rank?: any;
  max_entries?: any;
  league_type: string;
  scoring: string;
  admin_entry?: number;
  start_event: number;
  entry_can_leave: boolean;
  entry_can_admin: boolean;
  entry_can_invite: boolean;
  has_cup: boolean;
  cup_league?: any;
  cup_qualified?: any;
  entry_rank: number;
  entry_last_rank: number;
}

const useUser = (id: string) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      getUser(id).then((data) => setUser(data));
    }
  }, [id]);

  return user;
};

export default useUser;
