import { TimeItem } from "./types";
import { convertTimestamp, convertDateString } from "./utils";
import { strtotime } from "locutus/php/datetime";

export function ConvertTime(searchText: string): TimeItem[] {
  let items: TimeItem[] = [];

  if (searchText === "") {
    searchText = "now";
  }

  searchText = searchText.trim();

  if (searchText.length == 10 && searchText.match(/^\d{10}/)) {
    const dateString = convertTimestamp(parseInt(searchText));
    // icon emoji if is time , then is a clock , else is a calendar
    items = [
      {
        id: 1,
        val: dateString,
        icon: "📅",
        isCurrent: true,
        tType: "date",
        ctime: dateString,
      },
    ];
  } else if (searchText.length >= 3) {
    // convert date string to timestamp
    const currentTime = strtotime(searchText);
    if (currentTime == false) {
      // bugs
      items = [
        {
          id: 1,
          val: "wrong time format",
          icon: "🐞️",
          isCurrent: true,
          tType: "wrong",
          ctime: "",
        },
      ];
    } else {
      const dateString = convertTimestamp(currentTime);
      console.log(currentTime);
      items = [
        {
          id: 1,
          val: currentTime.toString(),
          icon: "⏱️",
          isCurrent: true,
          tType: "time",
          ctime: dateString,
        },
        {
          id: 2,
          val: dateString,
          icon: "📅",
          isCurrent: true,
          tType: "date",
          ctime: dateString,
        },
      ];
    }
  } else {
    // bugs
    items = [
      {
        id: 1,
        val: "waiting...... ",
        icon: "⌨️",
        isCurrent: true,
        tType: "wrong",
        ctime: "",
      },
    ];
  }

  return items;
}
