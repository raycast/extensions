import { Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast } from "./utils"
import { brewDoctorCommand } from "./brew"

interface State {
  output?: string;
  isLoading: boolean;
}

export default function Main() {
  const [state, setState] = useState<State>({isLoading: true});

  useEffect(() => {
    if (!state.isLoading) { return; }
    brewDoctorCommand()
      .then(output => {
        setState({output: output, isLoading: false});
      })
      .catch (err => {
        showFailureToast("Brew doctor failed", err);
        setState({isLoading: false});
      });
  }, [state]);

  return (
    <Detail markdown={state.output ?? ""} isLoading={state.isLoading} />
  );
}
