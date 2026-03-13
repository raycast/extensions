import { Role } from "./Role";

export interface Member {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isCurrentUser: boolean;
  isRobot: boolean;
  roles: Role[];
}
