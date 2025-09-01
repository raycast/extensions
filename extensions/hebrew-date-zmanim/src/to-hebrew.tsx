import { Action, ActionPanel, Clipboard, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { JewishCalendar, Parsha, Calendar } from "kosher-zmanim";

export default function Command() {
  const [date, setDate] = useState<Date>(new Date());
  const [afterSunset, setAfterSunset] = useState<boolean>(false);
  const { push } = useNavigation();

  function convert() {
    const d = new Date(date);
    if (afterSunset) {
      d.setDate(d.getDate() + 1);
    }
    const jc = new JewishCalendar();
    jc.setGregorianDate(d.getFullYear(), d.getMonth(), d.getDate());

    const hebrewDate = jc.toString();
    const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = dayNames[jc.getDayOfWeek()];

    // Get parsha info - only relevant for Saturday
    const parshaNum = jc.getParsha();
    let parshaInfo = "";
    if (jc.getDayOfWeek() === 7) {
      // Saturday
      parshaInfo = parshaNum > 0 ? Parsha[parshaNum].replace(/_/g, " ") : "None";
    } else {
      // For other days, find the upcoming Saturday's parsha
      const nextSat = new JewishCalendar();
      nextSat.setGregorianDate(d.getFullYear(), d.getMonth(), d.getDate());
      const daysToSat = (7 - nextSat.getDayOfWeek()) % 7;
      if (daysToSat === 0 && nextSat.getDayOfWeek() !== 7) {
        // If today is not Saturday, add 7 days
        nextSat.forward(Calendar.DATE, 7);
      } else if (daysToSat > 0) {
        nextSat.forward(Calendar.DATE, daysToSat);
      }
      const nextParshaNum = nextSat.getParsha();
      parshaInfo =
        nextParshaNum > 0 ? `${Parsha[nextParshaNum].replace(/_/g, " ")} (Shabbat will be)` : "None this week";
    }

    // Get special information
    const specialInfo = [];
    if (jc.isRoshChodesh()) specialInfo.push("Rosh Chodesh");
    if (jc.isChanukah()) specialInfo.push(`Chanukah Day ${jc.getDayOfChanukah()}`);
    if (jc.isYomTov()) specialInfo.push("Yom Tov");
    if (jc.isTaanis()) specialInfo.push("Taanit");
    if (jc.getDayOfOmer() > 0) specialInfo.push(`Omer Day ${jc.getDayOfOmer()}`);

    const lines: Record<string, string> = {
      "Hebrew Date": hebrewDate,
      "Day of Week": dayOfWeek,
      "Torah Portion": parshaInfo,
    };

    if (specialInfo.length > 0) {
      lines["Special Day"] = specialInfo.join(", ");
    }

    push(<Result title="Gregorian → Hebrew" lines={lines} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={convert} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="date" title="Gregorian Date" value={date} onChange={(d) => d && setDate(d)} />
      <Form.Checkbox
        id="afterSunset"
        title="After Sunset"
        label="Use next Hebrew date (if it's after sunset)"
        value={afterSunset}
        onChange={setAfterSunset}
      />
      <Form.Description text="Check 'After Sunset' if you want to get next day's Hebrew date (since Hebrew days begin at sunset)." />
    </Form>
  );
}

function Result({ title, lines }: { title: string; lines: Record<string, string> }) {
  const md = [`# ${title}`, "", ...Object.entries(lines).map(([k, v]) => `**${k}:** ${v}`)].join("\n");

  const copyAll = Object.values(lines).join(" | ");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Hebrew Date" content={lines["Hebrew Date"]} />
          <Action.CopyToClipboard title="Copy Torah Portion" content={lines["Torah Portion"]} />
          <Action title="Copy All" onAction={() => Clipboard.copy(copyAll)} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}
