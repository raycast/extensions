import { StatesList } from "./components/states";

export default function main(): JSX.Element {
  return <StatesList domain="binary_sensor" deviceClass="motion" />;
}
