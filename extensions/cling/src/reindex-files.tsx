import { Detail, showHUD, popToRoot, LaunchProps } from "@raycast/api";
import { execFile, ChildProcess } from "child_process";
import { useEffect, useRef, useState } from "react";

const CLING = "/Applications/Cling.app/Contents/SharedSupport/ClingCLI";

const SCOPES = ["home", "library", "applications", "system", "root"] as const;
type Scope = (typeof SCOPES)[number];

export default function Command(props: LaunchProps<{ arguments: { scope: string } }>) {
  const scope = props.arguments.scope?.trim() || "";
  const isAll = !scope;
  const label = isAll ? "all scopes" : scope;
  const [done, setDone] = useState(false);
  const proc = useRef<ChildProcess | null>(null);

  useEffect(() => {
    const args = ["reindex", "--wait"];
    if (!isAll && SCOPES.includes(scope as Scope)) {
      args.push("--scope", scope);
    }

    proc.current = execFile(CLING, args, (error) => {
      proc.current = null;
      if (error?.killed) return;
      if (error) {
        showHUD(`Cling: Failed to reindex ${label}`);
      } else {
        showHUD(`Cling: Reindex complete (${label})`);
      }
      setDone(true);
    });

    return () => {
      proc.current?.kill();
      proc.current = null;
    };
  }, []);

  useEffect(() => {
    if (done) popToRoot();
  }, [done]);

  return <Detail isLoading={true} markdown={`Reindexing **${label}**...`} />;
}