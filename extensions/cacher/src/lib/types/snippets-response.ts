import { Library } from "./library";
import { Team } from "./team";
import { User } from "./user";

export interface SnippetsResponse {
  user: User;
  personalLibrary: Library;
  teams: Team[];
}
