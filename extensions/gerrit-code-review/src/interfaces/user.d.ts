export interface UserVote {
  tag?: string;
  value: number;
  date: Date;
  permitted_voting_range: VoteRange;
  _account_id: number;
  name: string;
  username: string;
  tags: string[];
}

export interface User {
  _account_id?: number;
  name: string;
  display_name?: string;
  email: string;
  username?: string;
  status?: string;
  date?: Date;
  tz?: number;
  tags?: string[];
  avatars?: object;
}
