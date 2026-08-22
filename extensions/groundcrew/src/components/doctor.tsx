import { Action, ActionPanel, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createGroundcrewClient, type GroundcrewClient } from "../cli";

interface Preferences {
  crewPath?: string;
}

const GROUNDCREW_INSTALL_URL = "https://www.npmjs.com/package/@clipboard-health/groundcrew";

interface DoctorState {
  error?: unknown;
  isLoading: boolean;
  output?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Groundcrew failed without an error message.";
}

/**
 * Runs `crew doctor` and renders its diagnostics. Self-contained (reads the crewPath
 * preference and creates its own client) so it can be pushed from any error state.
 */
export function GroundcrewDoctor() {
  const { crewPath } = getPreferenceValues<Preferences>();
  const [state, setState] = useState<DoctorState>({ isLoading: true });
  const mounted = useRef(false);

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

  const run = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true }));
    try {
      const result = await (await getClient()).runDoctor();
      const output = `${result.stdout}\n${result.stderr}`.trim();
      if (mounted.current) {
        setState({
          isLoading: false,
          output: output.length > 0 ? output : "crew doctor produced no output.",
        });
      }
    } catch (error) {
      if (mounted.current) {
        setState({ isLoading: false, error });
      }
    }
  }, [getClient]);

  useEffect(() => {
    mounted.current = true;
    void run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  const markdown =
    state.error !== undefined
      ? `# Groundcrew Doctor\n\nCouldn't run \`crew doctor\`.\n\n\`\`\`\n${errorMessage(state.error)}\n\`\`\``
      : `# Groundcrew Doctor\n\n\`\`\`text\n${state.output ?? "Running crew doctor…"}\n\`\`\``;

  return (
    <Detail
      isLoading={state.isLoading}
      navigationTitle="Groundcrew Doctor"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Re-Run Doctor" icon={Icon.ArrowClockwise} onAction={run} />
          {state.output === undefined ? null : (
            <Action.CopyToClipboard title="Copy Diagnostics" content={state.output} />
          )}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Install Groundcrew CLI" icon={Icon.Download} url={GROUNDCREW_INSTALL_URL} />
        </ActionPanel>
      }
    />
  );
}
