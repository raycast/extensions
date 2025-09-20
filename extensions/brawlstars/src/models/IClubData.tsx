interface IClubData {
  tag: string;
  name: string;
  description: string;
  trophies: number;
  requiredTrophies: number;
  members: {
    icon: {
      id: number;
    };
    tag: string;
    name: string;
    trophies: number;
    role: string;
    nameColor: string;
  }[];
  type: string;
  badgeId: number;
}

export const emptyClubData: IClubData = {
  tag: "",
  name: "",
  description: "",
  trophies: 0,
  requiredTrophies: 0,
  members: [
    {
      icon: { id: 0 },
      tag: "",
      name: "",
      trophies: 0,
      role: "",
      nameColor: "",
    },
  ],
  type: "",
  badgeId: 0,
};
export type { IClubData };
