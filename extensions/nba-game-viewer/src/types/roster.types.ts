type Player = {
  id: string;
  fullName: string;
  position: string;
  injuries: Array<Injury>;
  headshot: string;
  weight: string;
  height: string;
  age: number;
  birthplace: string;
  jerseyNumber: string;
  salary: string;
  draft: string;
  link: string;
};

type Injury = {
  id: string;
  status: "Day-To-Day" | "Out";
  details: string;
};

export type { Player, Injury };
