import { User } from "@/domain/user";

import { Calendar } from "@/domain/calendar";

export interface Rota {
  calendars: Calendar[];
  teamMembers: Map<string, User>;
}
