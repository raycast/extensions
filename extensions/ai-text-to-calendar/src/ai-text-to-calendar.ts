import { showHUD, Toast, showToast, getSelectedText, getPreferenceValues, Clipboard, open } from "@raycast/api";
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
    const { openAiApiKey, language } = getPreferenceValues<Preferences.AiTextToCalendar>();

    showToast({ style: Toast.Style.Animated, title: "Extracting..." });
    const selectedText = await getSelectedText();
    const json = await ai(selectedText, openAiApiKey, language);
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

async function ai(text: string, openaiKey: string, language: string) {
  const systemMessage = `\
Extract schedule information from the text provided by the user.
The output should be in the following JSON format.

{
  title: string, // Event title
  start_date: YYYYMMDD, // Start date
  start_time: hhmmss, // Start time
  end_date: YYYYMMDD, // End date
  end_time: hhmmss, // End time
  details: string, // Summary in up to 3 concise sentences. URLs should be preserved regardless of length
  location: string // Event location
}

Note:
* Output in ${language}
* Do not include any content other than JSON format in the output
* If the organizer's name is known, include it in the title
* Ensure the location is easily identifiable
* If the end date and time are unknown, set it to 2 hours after the start date and time\
`;
  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${json.title}&dates=${json.start_date}T${json.start_time}/${json.end_date}T${json.end_time}&details=${json.details}&location=${json.location}&trp=false`;
  return url;
}
