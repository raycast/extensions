import { useCachedPromise } from "@raycast/utils";
import Process from "../models/Process";
import { Stack, StackSource, detectStack } from "../utilities/stack";
import { getWorkingDirectories } from "../utilities/workingDirectories";

type StackRequest = StackSource & { pid: number };

async function detectStacks(requests: StackRequest[]) {
  const workingDirectories = await getWorkingDirectories(requests.map((request) => request.pid));
  const stacks: Record<number, Stack> = {};

  await Promise.all(
    requests.map(async (request) => {
      stacks[request.pid] = await detectStack(request, workingDirectories.get(request.pid));
    }),
  );

  return stacks;
}

/**
 * The runtime and framework behind each listening process, keyed by PID. Only the fields detection
 * reads are passed on, so a reload that finds the same processes does not detect them again.
 */
export default function useStacks(processes: Process[] | undefined) {
  const requests: StackRequest[] = (processes ?? []).map((p) => ({
    pid: p.pid,
    name: p.name,
    path: p.path,
    commandLine: p.commandLine,
  }));

  const { data } = useCachedPromise(detectStacks, [requests], {
    keepPreviousData: true,
    execute: requests.length > 0,
  });

  return data ?? {};
}
