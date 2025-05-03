import { Detail, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { type WeeklyHoroscope } from "./types";
import { API_URL, DEFAULT_SIGN } from "./constants";
import generateSignMarkdown from "./utils/generateSignMarkdown";
import HoroscopeActions from "./components/HoroscopeActions";

export default function WeeklyHoroscope(props: LaunchProps<{ arguments: Arguments.WeeklyHoroscope }>) {
  const sign = props.arguments.sign || DEFAULT_SIGN;

  const params = new URLSearchParams({ sign });
  const { data, isLoading } = useFetch<WeeklyHoroscope>(API_URL + `weekly?${params}`);

  const markdown = generateSignMarkdown(sign) + (!data ? "" : `## ${data.data.week} \n\n ${data.data.horoscope_data}`);
  return <Detail isLoading={isLoading} markdown={markdown} actions={<HoroscopeActions data={data} />} />;
}
