import ViewCar from "./viewCar";

export default function Command() {
  return <ViewCar command="close_charge_port" loadingMessage="Closing charge door..." />;
}
