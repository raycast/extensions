import { COMMAND_NOT_FOUND_CODE, execPromise, isExecException } from "@/utils/async";

import {
  IvpnCliNotFoundError,
  IvpnFreeTrialExpiredError,
  IvpnInvalidAccountIdError,
  IvpnNotLoggedInError,
  IvpnPingAlreadyInProgressError,
  IvpnServersPingingSkippedError,
  IvpnSubscriptionExpiredError,
} from "./errors";
import { ConnectPayload } from "./types";
import {
  constructCliConnectCommand,
  parseIvpnAccountOuput,
  parseIvpnServersOutput,
  parseIvpnStatusOutput,
} from "./utils";

export class IVPN {
  @ivpnErrorInterpreter
  static async login(accountId: string) {
    return await execPromise(`ivpn login ${accountId}`);
  }

  @ivpnErrorInterpreter
  static async logout() {
    return await execPromise("ivpn logout");
  }

  @ivpnErrorInterpreter
  static async getStatus() {
    const { stdout } = await execPromise("ivpn status");
    return parseIvpnStatusOutput(stdout);
  }

  @ivpnErrorInterpreter
  static async connect(payload: ConnectPayload) {
    const cmd = constructCliConnectCommand(payload);
    const { stdout } = await execPromise(cmd);
    return parseIvpnStatusOutput(stdout);
  }

  @ivpnErrorInterpreter
  static async disconnect() {
    const { stdout } = await execPromise("ivpn disconnect");
    return parseIvpnStatusOutput(stdout);
  }

  @ivpnErrorInterpreter
  static async getServers(opts: { signal: AbortSignal; shouldPing: boolean }) {
    const { stdout } = await execPromise(`ivpn servers ${opts.shouldPing ? "-ping" : ""}`, {
      signal: opts.signal,
    });
    return parseIvpnServersOutput(stdout);
  }

  @ivpnErrorInterpreter
  static async getAccountInfo() {
    const { stdout } = await execPromise("ivpn account");
    return parseIvpnAccountOuput(stdout);
  }

  @ivpnErrorInterpreter
  static async pingCli() {
    return await execPromise("ivpn");
  }
}

function ivpnErrorInterpreter<T>(
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<T>>,
): TypedPropertyDescriptor<(...args: any[]) => Promise<T>> | void {
  const originalMethod = descriptor.value!;
  descriptor.value = async function (...args: any[]): Promise<T> {
    try {
      return await originalMethod.apply(this, args);
    } catch (err: any) {
      if (!isExecException(err)) throw err;

      if (err.code === COMMAND_NOT_FOUND_CODE) {
        throw new IvpnCliNotFoundError(err);
      }

      if (
        err.stdout?.startsWith("Error: Not logged in") ||
        err.stderr?.trim().startsWith("not logged in") ||
        err.stderr?.trim().startsWith("Error: not logged in")
      ) {
        throw new IvpnNotLoggedInError(err);
      }

      if (
        err.stderr?.startsWith("Error: [daemon] Your account ID has to be") ||
        err.stderr === "Error: [401] The provided Account ID is not valid"
      ) {
        throw new IvpnInvalidAccountIdError(err);
      }

      if (err.stderr?.includes("ping already in progress")) {
        throw new IvpnPingAlreadyInProgressError(err);
      }

      if (err.stderr?.includes("subscription has expired") || err.stdout?.includes("subscription has expired")) {
        throw new IvpnSubscriptionExpiredError(err);
      }

      if (err.stderr?.includes("free trial has expired") || err.stdout?.includes("free trial has expired")) {
        throw new IvpnFreeTrialExpiredError(err);
      }

      if (
        err.stderr?.includes("pinging skipped due to connected state") ||
        err.stdout?.includes("pinging skipped due to connected state")
      ) {
        throw new IvpnServersPingingSkippedError(err);
      }

      throw err;
    }
  };
  return descriptor;
}
