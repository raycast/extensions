import { MenuBarExtra } from "@raycast/api";
import useGetData from "./useGetData";
import { checkAranetHomeInstallation } from "./utils";

export default function AranetMenuBarCommand() {
  const data = useGetData();

  checkAranetHomeInstallation();

  return <MenuBarExtra isLoading={data === null} title={`${data ? data.co2 : "Loading..."} CO₂`}></MenuBarExtra>;
}
