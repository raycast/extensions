export interface UserData {
  firstName: string;
  lastName: string;
  handle: string;
  maxRating: number;
  maxRank: string;
  rating: number;
  rank: string;
  friendOfCount: string;
  organization: string;
  lastOnlineTimeSeconds: number;
  registrationTimeSeconds: number;
  titlePhoto: string;
}

export const initialUserData: UserData = {
  firstName: "",
  lastName: "",
  handle: "",
  maxRating: 0,
  maxRank: "",
  rating: 0,
  rank: "",
  friendOfCount: "",
  organization: "",
  lastOnlineTimeSeconds: 0,
  registrationTimeSeconds: 0,
  titlePhoto: "https://userpic.codeforces.org/no-title.jpg",
};
