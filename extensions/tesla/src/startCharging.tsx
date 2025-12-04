import ViewCar from "./viewCar";

export default function Command() {
  return <ViewCar command="start_charging" loadingMessage="Opening charge door..." />;
}
