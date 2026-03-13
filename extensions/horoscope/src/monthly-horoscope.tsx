import { Detail, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { type MonthlyHoroscope } from "./types";
import { API_URL, DEFAULT_SIGN } from "./constants";
import generateSignMarkdown from "./utils/generateSignMarkdown";
import HoroscopeActions from "./components/HoroscopeActions";

export default function MonthlyHoroscope(props: LaunchProps<{ arguments: Arguments.MonthlyHoroscope }>) {
  const sign = props.arguments.sign || DEFAULT_SIGN;

  const params = new URLSearchParams({ sign });
  const { data, isLoading } = useFetch<MonthlyHoroscope>(API_URL + `monthly?${params}`);

  const markdown =
    generateSignMarkdown(sign) +
    (!data
      ? ""
      : `## ${data.data.month} \n\n Challenging Days: ${data.data.challenging_days} \n\n Standout Days: ${data.data.standout_days} \n\n ${data.data.horoscope_data}`);
  return <Detail isLoading={isLoading} markdown={markdown} actions={<HoroscopeActions data={data} />} />;
}
