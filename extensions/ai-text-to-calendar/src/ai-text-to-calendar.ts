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

export default async function main() {
  try {
    const apiKey = getPreferenceValues().apiKey;
    const endpoint = getPreferenceValues().endpoint || "https://api.openai.com/v1";
    const language = getPreferenceValues().language || "English";
    const model = getPreferenceValues().model || "gpt-4o-mini";

    showToast({ style: Toast.Style.Animated, title: "Extracting..." });
    const selectedText = await getSelectedText();
    const json = await ai(selectedText, apiKey, language, endpoint, model);
    if (!json) {
      throw new Error("Extraction failed");
    }

    const calendarEvent = JSON.parse(json) as CalendarEvent;
    const url = toURL(calendarEvent);

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

function toURL(json: CalendarEvent) {
  // Clean up and format dates/times - remove any non-numeric characters
  const startDateTime = `${json.start_date.replace(/-/g, "")}T${json.start_time.replace(/:/g, "")}00`;
  const endDateTime = `${json.end_date.replace(/-/g, "")}T${json.end_time.replace(/:/g, "")}00`;

  // Encode parameters for URL safety
  const params = {
    text: encodeURIComponent(json.title),
    dates: `${startDateTime}/${endDateTime}`,
    details: encodeURIComponent(json.details),
    location: encodeURIComponent(json.location),
  };

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${params.text}&dates=${params.dates}&details=${params.details}&location=${params.location}&trp=false`;
  return url;
}
