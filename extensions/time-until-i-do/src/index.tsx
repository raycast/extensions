import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import moment from "moment";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

interface Preferences {
  bigDayDate: any;
  bigDayName: any;
}

export default function TimeUntil() {
  const [quote, setQuote] = useState<string>("");

  useEffect(() => {
    const getQuote = async () => {
      const response = await fetch("https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en");
      const data = (await response.json()) as any;
      const quote = data.quoteText;
      const author = data.quoteAuthor;
      const quoteText = "> 💬 " + quote + "- " + author;
      setQuote(quoteText);
    };
    getQuote();
  }, []);

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
      markdown={countdownCopy() + "\n" + "\n\n" + quote} // + FocusPoint()
      actions={
        <ActionPanel>
          <Action title="⚙️ Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
