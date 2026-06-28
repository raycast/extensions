export interface LifeProgressType {
  section: string;
  icon: string;
  title: string;
  titleCanvas: { canvas: string; text: string };
  subTitle: string;
  number: number;
  accessUnit?: { icon: string }[];
}

export interface CountdownDate {
  id: string;
  creatAt: number;
  modifyAt: number;
  title: string;
  description: string;
  date: number;
  icon: string;
}
