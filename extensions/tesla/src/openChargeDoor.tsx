import ViewCar from "./viewCar";

export default function Command() {
  return <ViewCar command="open_charge_port" loadingMessage="Opening charge door..." />;
}
