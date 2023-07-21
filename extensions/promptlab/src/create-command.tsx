import { useEffect } from "react";
import { installDefaults } from "./utils/file-utils";
import CommandForm from "./components/Commands/CommandForm";

export default function Command() {
  useEffect(() => {
    installDefaults();
  }, []);

  return <CommandForm />;
}
