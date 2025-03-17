import { Clipboard, getPreferenceValues, getSelectedText, open, showHUD, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";

interface CalendarEvent {
  title: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  details: string;
  location: string;
}

type Calendar = "googleCalendar" | "outlookPersonal" | "outlookOffice365";

export default async function main() {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const endpoint = getPreferenceValues().endpoint || "https://api.openai.com/v1";
    const language = getPreferenceValues().language || "English";
    const model = getPreferenceValues().model || "gpt-4o-mini";
    const calendar = getPreferenceValues().calendar || "googleCalendar";

    showToast({ style: Toast.Style.Animated, title: "Extracting..." });
    const selectedText = await getSelectedText();
    const json = await ai(selectedText, apiKey, language, endpoint, model);
    if (!json) {
      throw new Error("Extraction failed");
    }

    const calendarEvent = JSON.parse(json) as CalendarEvent;
    const url = toURL(calendarEvent, calendar);

    await showHUD("Extracted! Copied to clipboard and opened in browser.");
    await Clipboard.copy(`${url}`);
    await open(url);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}

async function ai(text: string, openaiKey: string, language: string, endpoint: string, model: string) {
  // get current date and time to string format, to let the LLM know the current date and time
  // date format: YYYY-MM-DD
  const date_str = new Date().toISOString().split("T")[0];
  // time format: HH:MM:SS
  const time_str = new Date().toISOString().split("T")[1].split(".")[0];
  // current week day
  const week_day = new Date().getDay().toString();

  console.log("date_str:", date_str);
  console.log("time_str:", time_str);
  console.log("week_day:", week_day);

  const systemMessage = `\
Extract schedule information from the text provided by the user.
The output should be in the following JSON format.

{
  title: string, // Event title, should be descriptive and very concise
  start_date: YYYYMMDD, // Start date
  start_time: hhmmss, // Start time
  end_date: YYYYMMDD, // End date
  end_time: hhmmss, // End time
  details: string, // Summary in up to 3 concise sentences. URLs should be preserved regardless of length
  location: string // Event location
}

Note:
* Output in ${language}
* Current date: ${date_str}, Current time: ${time_str}, Current week day: ${week_day}, try to set the event date and time based on the current date and time
* Do not include any content other than JSON format in the output
* If the organizer's name is known, include it in the title
* Ensure the location is easily identifiable
* If the duration is not specified, assume it is 2 hours
`;
  const openai = new OpenAI({ apiKey: openaiKey, baseURL: endpoint });
  const response = await openai.chat.completions.create({
    model: model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: text },
    ],
    temperature: 0.2,
    max_tokens: 256,
  });

  return response.choices[0].message.content;
}

function toURL(json: CalendarEvent, calendar: Calendar) {
  let url: string;
  console.log(json);

  const startDate = json.start_date.replace(/\D/g, "");
  const startTime = json.start_time.replace(/\D/g, "");
  const endDate = json.end_date.replace(/\D/g, "");
  const endTime = json.end_time.replace(/\D/g, "");

  switch (calendar) {
    case "outlookOffice365":
    case "outlookPersonal": {
      const baseUrl =
        calendar === "outlookOffice365"
          ? "https://outlook.office.com/calendar/deeplink/compose"
          : "https://outlook.live.com/calendar/deeplink/compose";

      const startDateTime = `${formatDateTimeForOutlook(startDate, startTime)}`;
      const endDateTime = `${formatDateTimeForOutlook(endDate, endTime)}`;

      const params = {
        text: encodeURIComponent(json.title),
        startdt: startDateTime,
        enddt: endDateTime,
        body: encodeURIComponent(json.details),
        location: encodeURIComponent(json.location),
      };
      url = `${baseUrl}?subject=${params.text}&startdt=${params.startdt}&enddt=${params.enddt}&body=${params.body}&location=${params.location}`;
      break;
    }
    case "googleCalendar":
    default: {
      // Clean up and format dates/times - remove any non-numeric characters
      const startDateTime = `${startDate}T${startTime}00`;
      const endDateTime = `${endDate}T${endTime}00`;
      const params = {
        text: encodeURIComponent(json.title),
        dates: `${startDateTime}/${endDateTime}`,
        details: encodeURIComponent(json.details),
        location: encodeURIComponent(json.location),
      };
      url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${params.text}&dates=${params.dates}&details=${params.details}&location=${params.location}&trp=false`;
    }
  }
  return url;
}

function formatDateTimeForOutlook(dateStr: string, timeStr: string): string {
  if (dateStr.length !== 8) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYYMMDD.`);
  }
  if (timeStr.length !== 6) {
    throw new Error(`Invalid time format: ${timeStr}. Expected hhmmss.`);
  }

  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);

  const hh = timeStr.slice(0, 2);
  const mm = timeStr.slice(2, 4);
  const ss = timeStr.slice(4, 6);

  return `${year}-${month}-${day}T${hh}:${mm}:${ss}00`;
}
