import { createReadyCommandRuntime, type CommandRuntimeBootstrap } from "../application/commandRuntime";
import {
  presentQuickAddCommandFailure,
  type QuickAddCommandInput,
  type QuickAddCommandToast,
} from "./executeQuickAddCommand";
import { executeQuickAddFromRuntime, type QuickAddCommandRuntimePorts } from "./quickAddCommandRuntime";

export type QuickAddCommandShellDependencies = Readonly<{
  bootstrap: CommandRuntimeBootstrap;
  ports: QuickAddCommandRuntimePorts;
}>;

type FailureToastEffect = (toast: QuickAddCommandToast) => unknown | Promise<unknown>;

export async function executeQuickAddCommandShell(
  dependencies: QuickAddCommandShellDependencies,
  input: QuickAddCommandInput
): Promise<void> {
  const ports = dependencies.ports;
  const showFailureToast = snapshotFailureToastEffect(ports);
  let runtime;

  try {
    const bootstrap = dependencies.bootstrap;
    if (typeof bootstrap !== "function") throw new TypeError("TickTick Quick Add bootstrap is invalid.");
    const runtimeInput = await Reflect.apply(bootstrap, dependencies, []);
    runtime = createReadyCommandRuntime(runtimeInput);
  } catch (error) {
    await showBootstrapFailure(showFailureToast, error);
    return;
  }

  await executeQuickAddFromRuntime(runtime, ports, input);
}

function snapshotFailureToastEffect(ports: QuickAddCommandRuntimePorts): FailureToastEffect | undefined {
  try {
    const commandEffects = ports.effects;
    const showToast = commandEffects.showToast;
    if (typeof showToast !== "function") return undefined;
    return (toast) => Reflect.apply(showToast, commandEffects, [toast]);
  } catch {
    return undefined;
  }
}

async function showBootstrapFailure(showToast: FailureToastEffect | undefined, error: unknown): Promise<void> {
  if (showToast === undefined) return;

  try {
    await showToast(presentQuickAddCommandFailure(error));
  } catch {
    return;
  }
}
