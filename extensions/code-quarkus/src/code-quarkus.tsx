import { useState } from "react";
import { Configure } from "./Configure";
import { Dependencies } from "./Dependencies";
import { QuarkusVersion } from "./models/QuarkusVersion";
import { Configuration } from "./models/Configuration";

export default function Command() {
  const [version, setVersion] = useState<QuarkusVersion>({ key: "" });
  const [step, setStep] = useState<"version" | "configure">("version");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);

  function handleConfigurationChange(config: Configuration) {
    if (config) {
      setConfiguration(config);
      setStep("configure");
    }
  }

  switch (step) {
    case "version":
      return <Configure onVersionChange={setVersion} onConfigurationChange={handleConfigurationChange} />;
    //case "presets": return ();
    case "configure":
      return <Dependencies version={version} configuration={configuration!} />;
  }
}
