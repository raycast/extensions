import { Detail, getPreferenceValues, type LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import { createGroundcrewClient, type GroundcrewClient } from "./cli";
import { lifecycleErrorDetail } from "./components/lifecycle-actions";

interface Preferences {
  crewPath?: string;
}

interface Arguments {
  target: string;
  kind?: string;
}

interface OpenState {
  isLoading: boolean;
  message?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Groundcrew failed without an error message.";
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { crewPath } = getPreferenceValues<Preferences>();
  const target = props.arguments.target.trim();
  const kind = props.arguments.kind === "branch" ? "branch" : "pr";
  const [state, setState] = useState<OpenState>({ isLoading: true });
  const started = useRef(false);

  const getClient = useMemo(() => {
    let clientPromise: Promise<GroundcrewClient> | undefined;
    return async () => {
      clientPromise ??= createGroundcrewClient({
        ...(crewPath?.trim() ? { executablePath: crewPath.trim() } : {}),
      });
      try {
        return await clientPromise;
      } catch (error) {
        clientPromise = undefined;
        throw error;
      }
    };
  }, [crewPath]);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Workspace" });
      try {
        const result = await (await getClient()).openWorkspace(target, { kind });
        if (result.kind === "success") {
          toast.style = Toast.Style.Success;
          toast.title = "Workspace Opened";
          setState({ isLoading: false, message: `Opened \`${target}\` as a Groundcrew workspace.` });
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Couldn’t Open Workspace";
          const detail = lifecycleErrorDetail(result) ?? "crew open failed.";
          toast.message = detail;
          setState({ isLoading: false, message: detail });
        }
      } catch (error) {
        const detail = errorMessage(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn’t Open Workspace";
        toast.message = detail;
        setState({ isLoading: false, message: detail });
      }
    })();
  }, [getClient, target, kind]);

  const heading = kind === "branch" ? "Opening Branch" : "Opening Pull Request";
  return <Detail isLoading={state.isLoading} markdown={`## ${heading}\n\n\`${target}\`\n\n${state.message ?? ""}`} />;
}
