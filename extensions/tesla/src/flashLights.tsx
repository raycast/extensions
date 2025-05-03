import ViewCar from "./viewCar";

export default function Command() {
  return (
    <ViewCar
      command="flash"
      loadingMessage="Flashing lights...
    "
    />
  );
}
