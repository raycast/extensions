import moment from "jalali-moment";

type ConvertMode = "jalaliToGregorian" | "gregorianToJalali";
type Values = {
  jalaliYear: string;
  jalaliMonth: string;
  jalaliDay: string;
  gregorianYear: string;
  gregorianMonth: string;
  gregorianDay: string;
};

export default function convertor({
  convertMode,
  values,
}: {
  convertMode: ConvertMode;
  values: Values;
}): string | false {
  if (convertMode === "jalaliToGregorian") {
    const date = moment(`${values.jalaliYear}-${values.jalaliMonth}-${values.jalaliDay}`, "jYYYY-jM-jD");
    if (!date.isValid()) {
      console.log("Invalid date");
      return false;
    }
    return date.format("YYYY-MM-DD");
  }
  if (convertMode === "gregorianToJalali") {
    const date = moment(`${values.gregorianYear}-${values.gregorianMonth}-${values.gregorianDay}`, "YYYY-M-D");
    if (!date.isValid()) {
      console.log("Invalid date");
      return false;
    }
    return date.format("jYYYY-jM-jD");
  }
  return false;
}
