export interface Author {
  contestId: number;
  members: { handle: string }[];
  participantType: string;
  ghost: boolean;
  room: number;
  startTimeSeconds: number;
}
