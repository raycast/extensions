export interface UserData {
  firstName?: string;
  lastName?: string;
  handle?: string;
  maxRating?: string;
  maxRank?: string;
  rating?: string;
  rank?: string;
  friendOfCount?: string;
  organization?: string;
  lastOnlineTimeSeconds?: number;
  registrationTimeSeconds?: number;
  titlePhoto?: string;
}

export const initialUserData: UserData = {
  firstName: "",
  lastName: "",
  handle: "",
  maxRating: "",
  maxRank: "",
  rating: "",
  rank: "",
  friendOfCount: "",
  organization: "",
  lastOnlineTimeSeconds: 0,
  registrationTimeSeconds: 0,
  titlePhoto: "https://userpic.codeforces.org/no-title.jpg",
};
