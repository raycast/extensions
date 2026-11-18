import { launchAnvilURL } from "./launch-anvil";

export default async function OpenSqlFormatterCommand() {
  await launchAnvilURL("anvil://tool/sql-formatter");
}
