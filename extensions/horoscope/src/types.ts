type Common = {
  status: 200;
  success: true;
};
export type DailyHoroscope = Common & {
  data: {
    date: string;
    horoscope_data: string;
  };
};

export type WeeklyHoroscope = Common & {
  data: {
    horoscope_data: string;
    week: string;
  };
};

export type MonthlyHoroscope = Common & {
  data: {
    challenging_days: string;
    horoscope_data: string;
    month: string;
    standout_days: string;
  };
};
