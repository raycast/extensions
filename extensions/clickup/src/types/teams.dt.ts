export interface TeamsResponse {
  teams: TeamItem[];
}
export interface TeamItem {
  id: string;
  name: string;
  color: string;
  avatar: null;
  members: MembersItem[];
}
interface MembersItem {
  user: User;
  invited_by: Invited_by;
  can_see_time_spent?: boolean;
  can_see_time_estimated?: boolean;
  can_see_points_estimated?: boolean;
  can_edit_tags?: boolean;
}
interface User {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: null | string;
  initials: string;
  role: number;
  custom_role: null;
  last_active: string;
  date_joined: string;
  date_invited: string;
}
interface Invited_by {
  id: number;
  username: string;
  color: string;
  email: string;
  initials: string;
  profilePicture: null | string;
}
