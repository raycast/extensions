import { Detail, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { type DailyHoroscope } from "./types";
import { API_URL } from "./constants";
import generateSignMarkdown from "./utils/generateSignMarkdown";
import HoroscopeActions from "./components/HoroscopeActions";

export default function DailyHoroscope(props: LaunchProps<{ arguments: Arguments.DailyHoroscope }>) {
    const { sign, day } = props.arguments;

    const params = new URLSearchParams({sign, day});
    const { data, isLoading } = useFetch<DailyHoroscope>(API_URL + `daily?${params}`);

    const markdown = generateSignMarkdown(sign) + (data && `${data.data.date} \n\n ${data.data.horoscope_data}`);
    return <Detail isLoading={isLoading} markdown={markdown} actions={<HoroscopeActions data={data} />} />
}   