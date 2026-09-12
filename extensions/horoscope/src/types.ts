type Common = {
  data: {
    date: string;
    period: string;
    sign: string;
    horoscope: string;
  };
};
export type DailyHoroscope = Common;

export type WeeklyHoroscope = Common;

export type MonthlyHoroscope = Common;
