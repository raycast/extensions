import { MeasureTimeEnum } from "./enum";

interface IData {
  id: number;
  title: MeasureTimeEnum;
}

export const data: IData[] = [
  { id: 1, title: MeasureTimeEnum.NANOSECOND },
  { id: 2, title: MeasureTimeEnum.MICROSECOND },
  { id: 3, title: MeasureTimeEnum.MILISECOND },
  { id: 4, title: MeasureTimeEnum.SECOND },
  { id: 5, title: MeasureTimeEnum.MINUTE },
  { id: 6, title: MeasureTimeEnum.HOUR },
  { id: 7, title: MeasureTimeEnum.DAY },
  { id: 8, title: MeasureTimeEnum.WEEK },
  { id: 9, title: MeasureTimeEnum.MONTH },
];
