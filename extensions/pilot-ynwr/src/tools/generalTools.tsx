import { Color, Icon } from "@raycast/api";
import { Journal, TimeItem } from "../interfaces/itemsInterfaces";

export const getColor = (color: string) => {
  switch (color) {
    case "red":
      return Color.Red;
    case "green":
      return Color.Green;
    case "yellow":
      return Color.Yellow;
    case "orange":
      return Color.Orange;
    default:
      return Color.PrimaryText;
  }
};

export const strToData = (string: string) => {
  return JSON.parse(string) as object;
};
export const dataToStr = (data: object | null) => {
  return JSON.stringify(data);
};

export const getColorToNotion = (colorRaycast: string) => {
  switch (colorRaycast) {
    case Color.Red:
      return "red";
    case Color.Green:
      return "green";
    case Color.Yellow:
      return "yellow";
    case Color.Orange:
      return "orange";
  }
};

export const getNumbDay = (day: string) => {
  switch (day) {
    case "Monday":
      return 1;
    case "Tuesday":
      return 2;
    case "Wednesday":
      return 3;
    case "Thursday":
      return 4;
    case "Friday":
      return 5;
    case "Saturday":
      return 6;
    case "Sunday":
      return 7;
    default:
      return 0;
  }
};
export const getStringDay = (day: number) => {
  switch (day) {
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
    case 7:
      return "Sunday";
    default:
      return "none";
  }
};

export const getIconPriority = (color: string) => {
  const text = "raycast-";
  let icon = "";
  switch (color) {
    case text + "red":
      icon = "🔴";
      break;
    case text + "yellow":
      icon = "🟡";
      break;
    case text + "orange":
      icon = "🟠";
      break;
    default:
      return "";
  }
  return icon;
};

export const getTodoIcon = (bool: boolean) => {
  if (bool) return Icon.CheckCircle;
  else return Icon.Circle;
};

export const getDateMounthAndNumber = (date: string) => {
  const d = new Date(date);
  const month = getMounthStringByMonthNumber(d.getMonth());
  return d.getDate() + " " + month;
};

export const getMounthStringByMonthNumber = (monthNumber: number) => {
  switch (monthNumber) {
    case 0:
      return "January";
    case 1:
      return "February";
    case 2:
      return "March";
    case 3:
      return "April";
    case 4:
      return "May";
    case 5:
      return "June";
    case 6:
      return "July";
    case 7:
      return "August";
    case 8:
      return "September";
    case 9:
      return "October";
    case 10:
      return "November";
    case 11:
      return "December";
    default:
      return "";
  }
};

export const getDayAndDate = (d: string) => {
  const date = new Date(d);
  const day = getTextDay(date.getDay());
  const numb = date.getDate();
  return day + " " + numb;
};

export const getDateAndMohth = (d: string) => {
  const date = new Date(d);
  const numb = date.getDate();
  let month = (date.getMonth() + 1).toString();
  if (month.length === 1) month = "0" + month;
  return numb + "/" + month;
};

export const getDayDateAndMouth = (d: string) => {
  const date = new Date(d);
  const day = getTextDay(date.getDay());
  const numb = date.getDate();
  const month = date.getMonth();
  return day + " " + numb + " " + getMounthStringByMonthNumber(month);
};

export const getHoursAndMin = (d: string) => {
  const date = new Date(d);
  let hour = date.getHours().toString();
  if (hour.length === 1) hour = "0" + hour;
  let min = date.getMinutes().toString();
  if (min.length === 1) min = "0" + min;
  return hour + ":" + min;
};

const getTextDay = (n: number) => {
  switch (n) {
    case 0:
      return "Sun";
    case 1:
      return "Mon";
    case 2:
      return "Tue";
    case 3:
      return "Wed";
    case 4:
      return "Thu";
    case 5:
      return "Fri";
    case 6:
      return "Sat";
    case 7:
      return "Sun";
    default:
      return ":(";
  }
};

export const getDayStringByDayNumber = (dayNumber: number) => {
  switch (dayNumber) {
    case 1:
      return "Sunday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
    case 7:
      return "Sunday";
    default:
      return "";
  }
};

export const progbar = (done: number, all: number, show: boolean) => {
  const bool = show !== undefined ? show : true;
  const ratio = done / all;
  let pg = "";
  if (ratio >= 0 && ratio < 0.1) pg = "🔲🔲🔲🔲🔲🔲🔲🔲🔲🔲";
  else if (ratio >= 0.1 && ratio < 0.2) pg = "🟥🔲🔲🔲🔲🔲🔲🔲🔲🔲";
  else if (ratio >= 0.2 && ratio < 0.3) pg = "🟥🟥🔲🔲🔲🔲🔲🔲🔲🔲";
  else if (ratio >= 0.3 && ratio < 0.4) pg = "🟥🟥🟥🔲🔲🔲🔲🔲🔲🔲";
  else if (ratio >= 0.4 && ratio < 0.5) pg = "🟧🟧🟧🟧🔲🔲🔲🔲🔲🔲";
  else if (ratio >= 0.5 && ratio < 0.6) pg = "🟧🟧🟧🟧🟧🔲🔲🔲🔲🔲";
  else if (ratio >= 0.6 && ratio < 0.7) pg = "🟧🟧🟧🟧🟧🟧🔲🔲🔲🔲";
  else if (ratio >= 0.7 && ratio < 0.8) pg = "🟨🟨🟨🟨🟨🟨🟨🔲🔲🔲";
  else if (ratio >= 0.8 && ratio < 0.9) pg = "🟨🟨🟨🟨🟨🟨🟨🟨🔲🔲";
  else if (ratio >= 0.9 && ratio < 1) pg = "🟨🟨🟨🟨🟨🟨🟨🟨🟨🔲";
  else if (ratio === 1) pg = "🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩";
  return (bool ? done.toString() + "/" + all.toString() : "") + " " + pg;
};

export const getSortedTimeItem = (items: TimeItem[]) => {
  return items.sort((a: TimeItem, b: TimeItem) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
};

export const getConvertTimeItem = (journals: Journal[]) => {
  const timeItems: TimeItem[] = [];
  if (journals.length !== 0)
    journals.forEach((j: Journal) => {
      const item: TimeItem = { item: j, startDate: j.date };
      timeItems.push(item);
    });

  return timeItems;
};

export const getAPIError = (code: string, type: string) => {
  let text;
  switch (code) {
    case "validation_error":
      text = "Your ID Database of your " + type + " page is invalid. Check if the id of your page is correct.";
      break;
    case "object_not_found":
      text =
        "We cannot find your " +
        type +
        " page. Check if you authorize the Pilot Extension on Notion for the " +
        type +
        " page.";
      break;
    case "ENOTFOUND":
      text = "It seems you are not connected to Internet.";
      break;
    case "unauthorized":
      text = "It seems we cannot connect to your Notion. Please reconnect to Notion in the Raycast Preferences.";
      break;
    default:
      text = "This error is not maintained, please contact us";
      break;
  }
  return text;
};

export const getAPIidFromLink = (link: string) => {
  const splitLinked = link.split("/");
  const apiID = splitLinked[3].split("?").shift();
  if (apiID === undefined) {
    return "misss";
  }

  return apiID;
};

export const getTimesText = (time: number) => {
  const hours = Math.floor(time / 60).toString();
  const min = (time % 60).toString();
  return { hours, min };
};
