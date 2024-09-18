import { Library } from "./library";
import { User } from "./user";

export interface Team {
  name: string;
  screenname: string;
  guid: string;
  userRole: "member" | "manager" | "owner";
  library: Library;
  viewers: User[];
  members: User[];
  managers: User[];
  owner: User;
}
