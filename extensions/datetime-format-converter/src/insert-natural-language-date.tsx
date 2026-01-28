import { Clipboard, getPreferenceValues, LaunchProps, showToast, Toast } from "@raycast/api";
import { parseDate } from "chrono-node";
import dayjs from "dayjs";

const isValidFormat = (format: string): boolean => {
  // https://day.js.org/docs/en/display/format
  const validTokens = [
    "YYYY",
    "YY",
    "MMMM",
    "MMM",
    "MM",
    "M",
    "DD",
    "D",
    "dddd",
    "ddd",
    "dd",
    "d",
    "HH",
    "H",
    "hh",
    "h",
    "mm",
    "m",
    "ss",
    "s",
    "SSS",
    "ZZ",
    "Z",
    "A",
    "a",
  ];
  const stripped = format.replace(/[-/.,: ]/g, "");
  const remaining = validTokens.reduce((str, token) => str.replaceAll(token, ""), stripped);
  return remaining.length === 0;
};

const InsertNaturalLanguageDate = async (
  props: LaunchProps<{
    arguments: Arguments.InsertNaturalLanguageDate;
  }>
): Promise<void> => {
  const prompt = props.arguments.prompt || "today";
  const parsed = parseDate(prompt);
  if (!parsed) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to parse date prompt: ${prompt}`,
    });
    return;
  }
  const format =
    props.arguments.format || getPreferenceValues<Preferences.InsertNaturalLanguageDate>().naturalLanguageDateFormat;
  if (!isValidFormat(format)) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Invalid date format: ${format}`,
    });
    return;
  }
  const formatted = dayjs(parsed).format(format);
  await Clipboard.paste(formatted);
};

export default InsertNaturalLanguageDate;
