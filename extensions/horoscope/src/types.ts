export type DailyHoroscope = {
    data: {
        date: string;
        horoscope_data: string;
    }
    status: 200;
    success: true;
}

export type WeeklyHoroscope = {
    data: {
        horoscope_data: string;
        week: string;
    }
    status: 200;
    success: true;
}

export type MonthlyHoroscope = {
    data: {
        challenging_days: string;
        horoscope_data: string;
        month: string;
        standout_days: string;
    }
    status: 200;
    success: true;
}