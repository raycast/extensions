export interface LifeProgress {
  section: string;
  icon: string;
  title: string;
  titleCanvas: { canvas: string; text: string };
  subTitle: string;
  number: number;
  accessUnit: { icon: string }[];
}

export interface CountdownDate {
  creatAt: number;
  modifyAt: number;
  title: string;
  description: string;
  date: number;
  icon: string;
}
