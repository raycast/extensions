import { LaunchProps } from "@raycast/api";
import { WeatherListOrDay } from "./components/weather";
import { LaunchContextDay } from "./menubar";

export default function index(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const context: LaunchContextDay | undefined = props.launchContext as LaunchContextDay;
  return <WeatherListOrDay day={context?.day} />;
}
