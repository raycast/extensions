import { runPrivateInternetAcessCmd } from "./utils";
export default async () => {
  await runPrivateInternetAcessCmd("connect", "Connecting to Private Internet Access...");
};
