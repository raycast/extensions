import { useEffect } from "react";
import { installDefaults } from "./lib/files/file-utils";
import CommandForm from "./components/Commands/CommandForm";

export default function Command() {
  useEffect(() => {
    installDefaults();
  }, []);

  return <CommandForm />;
}
