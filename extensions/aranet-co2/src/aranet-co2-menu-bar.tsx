import { MenuBarExtra } from "@raycast/api";
import useGetData from "./useGetData";

export default function AranetMenuBarCommand() {
  const data = useGetData();

  return <MenuBarExtra isLoading={data === null} title={`${data ? data.co2 : "Loading..."} CO₂`}></MenuBarExtra>;
}
