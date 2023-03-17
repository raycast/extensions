import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import moment from "moment";
import fetch from "node-fetch";
import { useEffect } from "react";

interface Preferences {
  bigDayDate: any;
  bigDayName: any;
}

export default function TimeUntil() {
  const { bigDayDate } = getPreferenceValues<Preferences>();
  const { bigDayName } = getPreferenceValues<Preferences>();

  const bigDay = moment(bigDayDate);
  const now = moment();

  const yearsUntil = bigDay.diff(now, "years", true).toFixed(2);
  const monthsUntil = bigDay.diff(now, "months").toLocaleString();
  const weeksUntil = bigDay.diff(now, "weeks").toLocaleString();
  const daysUntil = bigDay.diff(now, "days").toLocaleString();
  const hoursUntil = bigDay.diff(now, "hours").toLocaleString();
  const minutesUntil = bigDay.diff(now, "minutes").toLocaleString();
  const secondsUntil = bigDay.diff(now, "seconds").toLocaleString();

  const countdownCopy = () => {
    return (
      "# Time Until " +
      bigDayName +
      " ⏱\n\n" +
      "🎉 Only " +
      yearsUntil +
      " year(s) until the big event!\n\n" +
      "🎉 Just " +
      monthsUntil +
      " month(s) to go!\n\n" +
      "🎉 Only " +
      weeksUntil +
      " week(s) left until " +
      bigDayName +
      "!\n\n" +
      "🎉 Just " +
      daysUntil +
      " day(s) to go until " +
      bigDayName +
      "!\n\n" +
      "🎉 Only " +
      hoursUntil +
      " hour(s) until " +
      bigDayName +
      "!\n\n" +
      "🎉 Just " +
      minutesUntil +
      " minute(s) until " +
      bigDayName +
      "!\n\n" +
      "🎉 Only " +
      secondsUntil +
      " second(s) until " +
      bigDayName +
      "!"
    );
  };

  const FocusPoint = () => {
    return (
      "# Focus Points 🔍\n" +
      "- Family 👨‍👩‍👧‍👦\n" +
      "- Future 🔮\n" +
      "- Faith 🙏\n" +
      "- Fitness 🏋️‍♂️\n" +
      "- Finances 💰\n" +
      "- Friends 👯‍♂️\n" +
      "- Fun 🎉\n" +
      "- Freedom 🕊️\n"
    );
  };

  return (
    <Detail
      markdown={countdownCopy() + "\n" + "\n\n"} // + FocusPoint()
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
