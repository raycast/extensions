import ViewCar from "./viewCar";

export default function Command() {
  return <ViewCar command="disable_sentry" loadingMessage="Turning Sentry Mode Off..." />;
}
