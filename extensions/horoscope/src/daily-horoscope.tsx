import { Detail, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { type DailyHoroscope } from "./types";
import { API_URL, DEFAULT_SIGN } from "./constants";
import generateSignMarkdown from "./utils/generateSignMarkdown";
import HoroscopeActions from "./components/HoroscopeActions";

export default function DailyHoroscope(props: LaunchProps<{ arguments: Arguments.DailyHoroscope }>) {
  const day = props.arguments.day;
  const sign = props.arguments.sign || DEFAULT_SIGN;

  const params = new URLSearchParams({ sign, day });
  const { data, isLoading } = useFetch<DailyHoroscope>(API_URL + `daily?${params}`);

  const markdown = generateSignMarkdown(sign) + (!data ? "" : `## ${data.data.date} \n\n ${data.data.horoscope_data}`);
  return <Detail isLoading={isLoading} markdown={markdown} actions={<HoroscopeActions data={data} />} />;
}
