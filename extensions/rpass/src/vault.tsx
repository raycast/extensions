import { useEffect } from "react";
import { configureRpassClientFromPreferences } from "./rpass/application/configure-rpass-client";
import { resolveStorePath } from "./vault/application/store-path";
import checkInstall from "./vault/presentation/check-install";
import Store from "./vault/presentation/store";

export default function Command() {
  configureRpassClientFromPreferences();
  const storepath = resolveStorePath();

  useEffect(() => {
    checkInstall();
  }, []);

  return <Store storepath={storepath} />;
}
