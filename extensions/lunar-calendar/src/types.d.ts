// types.d.ts
declare module "lunar-javascript" {
  export class Lunar {
    getJieQi(): string;
    getFestivals(): string[];
    getDayInChinese(): string;
    getMonthInChinese(): string;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getFestivals(): string[];
    getLunar(): Lunar;
  }

  export class Holiday {
    isWork(): boolean;
    getName(): string;
  }

  export class HolidayUtil {
    static getHoliday(year: number, month: number, day: number): Holiday | null;
  }
}
