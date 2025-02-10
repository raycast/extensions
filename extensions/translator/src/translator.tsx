import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

interface State {
  isLoading: boolean;
  text?: string;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: true });

  console.log(`Component rendered: ${Math.random()}`);
  useEffect(() => {
    console.log(`Effect executed: ${Math.random()}`);

    async function run() {
      console.log(`run command: ${Math.random()}`);
      const command = `pbpaste | ~/bin/trans -m 70b`;
      try {
        const { stdout } = await execAsync(command, {
          env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", NO_PBCOPY: "1" },
        });
        // console.log(`stdout: ${stdout}`)
        setState({ isLoading: false, text: stdout });
      } catch (error: unknown) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: (error as Error).message,
        });
        setState({ isLoading: false });
      }
    }

    run();
  }, []);

  console.log(`isLoading: ${state.isLoading}, text: ${state.text?.substring(0, 10)}`);
  return <Detail isLoading={state.isLoading} markdown={state.text} />;
}
