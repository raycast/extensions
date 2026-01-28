import ViewCar from "./viewCar";

export default function Command() {
  return <ViewCar command="stop_charging" loadingMessage="Opening charge door..." />;
}
