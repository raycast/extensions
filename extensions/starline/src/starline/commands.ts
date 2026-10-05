import { StarLineClient } from "./client";
import { API_VERSION } from "./constants";
import { deviceUrl } from "./urls";
import { DisplayableError } from "../utils/errors";

import type { CarStatus } from "../types/devices";
import type { AsyncCommandResponse, HijackVariables } from "../types/starline";

export type CommandValue = string | number | boolean;
type CommandBody = Record<string, unknown> & { type: string };
type AsyncCommandOptions = { intervalMs?: number; timeoutMs?: number };
type CommandVariables = HijackVariables;
type CommandExecutionOptions = AsyncCommandOptions & { variables?: CommandVariables };

const POLL_INTERVAL_MS = 2_000;
const COMMAND_TIMEOUT_MS = 30_000;
const DEFAULT_COMMAND_VALUE = 1;

const ASYNC_STATUS = {
    done: 2,
    failed: 3,
    offline: 4,
    deviceTimeout: 5,
    expired: 6,
} as const;

const ASYNC_ERRORS: Partial<Record<number, string>> = {
    [ASYNC_STATUS.failed]: "Command failed on device",
    [ASYNC_STATUS.offline]: "Device is offline",
    [ASYNC_STATUS.deviceTimeout]: "Device response timeout",
    [ASYNC_STATUS.expired]: "Command status expired on server",
};

const COMMAND_TYPES = {
    startEngine: "ign_start",
    stopEngine: "ign_stop",
    arm: "arm_start",
    disarm: "arm_stop",
    armQuietly: "arm_start_quiet",
    disarmQuietly: "arm_stop_quiet",
    shockSensorBypass: "shock_bpass",
    tiltSensorBypass: "tilt_bpass",
    additionalSensorBypass: "add_sens_bpass",
    serviceMode: "valet",
    horn: "poke",
    updatePosition: "update_position",
    ignition: "ign",
    securityMode: "arm",
    quietSecurityMode: "arm_quiet",
    hijack: "hijack",
    handsFree: "hfree",
    disarmTrunk: "disarm_trunk",
    panic: "panic",
    balance: "getbalance",
    output: "out",
    dvr: "dvr",
    webasto: "webasto",
    webastoOn: "webasto_on",
    webastoOff: "webasto_off",
} as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const commandUrl = (deviceId: string) => deviceUrl(API_VERSION.v1, deviceId, "set_param");
const asyncCommandUrl = (deviceId: string, commandId?: string) =>
    deviceUrl(API_VERSION.v2, deviceId, ["async", commandId].filter(Boolean).join("/"));
const commandBody = (
    type: string,
    value: CommandValue = DEFAULT_COMMAND_VALUE,
    variables?: CommandVariables,
): CommandBody => {
    const body: CommandBody = { type, [type]: value };
    return variables === undefined ? body : { ...body, variables: [variables] };
};
const asyncCommandBody = (type: string, value: CommandValue = DEFAULT_COMMAND_VALUE, variables?: CommandVariables) =>
    variables === undefined ? { type, value } : { type, value, variables };
const boolValue = (enabled: boolean) => (enabled ? 1 : 0);
const flexCommandType = (index: number) => `flex_${index}`;
const isDone = ({ status }: AsyncCommandResponse) => status === ASYNC_STATUS.done;
const isFailed = ({ status }: AsyncCommandResponse) => status >= ASYNC_STATUS.failed;
const asyncError = ({ status, codestring }: AsyncCommandResponse) =>
    ASYNC_ERRORS[status] ?? (codestring.length > 0 ? codestring : "Unknown async command error");

class AsyncCommandError extends Error {}

export class StarLineCommands extends StarLineClient {
    async sendCommandWithAsyncFallback<T = unknown>(
        deviceId: string,
        type: string,
        value: CommandValue = DEFAULT_COMMAND_VALUE,
        options: CommandExecutionOptions = {},
    ) {
        const { variables, ...pollingOptions } = options;
        let response: AsyncCommandResponse;

        try {
            response = await this.sendAsyncCommand(deviceId, type, value, variables);
        } catch {
            return this.sendCommand<T>(deviceId, type, value, variables);
        }

        if (isDone(response)) {
            return response as T;
        }
        if (isFailed(response)) {
            throw new AsyncCommandError(asyncError(response));
        }
        if (response.cmd_id === undefined || response.cmd_id.length === 0) {
            throw new AsyncCommandError("Async command response does not contain command id");
        }

        return (await this.waitForAsyncCommand(deviceId, response.cmd_id, pollingOptions)) as T;
    }

    startEngine(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.startEngine);
    }

    stopEngine(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.stopEngine);
    }

    arm(deviceId: string) {
        return this.sendCommand<CarStatus>(deviceId, COMMAND_TYPES.arm);
    }

    disarm(deviceId: string) {
        return this.sendCommand<CarStatus>(deviceId, COMMAND_TYPES.disarm);
    }

    armQuietly(deviceId: string) {
        return this.sendCommand<CarStatus>(deviceId, COMMAND_TYPES.armQuietly);
    }

    disarmQuietly(deviceId: string) {
        return this.sendCommand<CarStatus>(deviceId, COMMAND_TYPES.disarmQuietly);
    }

    shockSensorBypass(deviceId: string) {
        return this.sendCommand(deviceId, COMMAND_TYPES.shockSensorBypass);
    }

    tiltSensorBypass(deviceId: string) {
        return this.sendCommand(deviceId, COMMAND_TYPES.tiltSensorBypass);
    }

    additionalSensorBypass(deviceId: string) {
        return this.sendCommand(deviceId, COMMAND_TYPES.additionalSensorBypass);
    }

    serviceModeEnable(deviceId: string) {
        return this.sendCommand(deviceId, COMMAND_TYPES.serviceMode, 1);
    }

    serviceModeDisable(deviceId: string) {
        return this.sendCommand(deviceId, COMMAND_TYPES.serviceMode, 0);
    }

    horn(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.horn);
    }

    updatePosition(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.updatePosition);
    }

    setIgnition(deviceId: string, enabled: boolean) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.ignition, boolValue(enabled));
    }

    setSecurityMode(deviceId: string, enabled: boolean) {
        return this.sendCommand<CarStatus>(deviceId, COMMAND_TYPES.securityMode, boolValue(enabled));
    }

    setQuietSecurityMode(deviceId: string, enabled: boolean) {
        return this.sendCommand<CarStatus>(deviceId, COMMAND_TYPES.quietSecurityMode, boolValue(enabled));
    }

    async setHijackMode(deviceId: string, enabled: boolean, pinCode: string) {
        const trimmedPinCode = pinCode.trim();
        if (trimmedPinCode.length === 0) {
            throw new DisplayableError("Hijack PIN is required");
        }

        const result = await this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.hijack, boolValue(enabled), {
            variables: { pin_code: trimmedPinCode },
        });
        return result;
    }

    setHandsFree(deviceId: string, enabled: boolean) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.handsFree, boolValue(enabled));
    }

    disarmTrunk(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.disarmTrunk);
    }

    panic(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.panic);
    }

    getBalance(deviceId: string, simSlot: 1 | 2) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.balance, simSlot);
    }

    setOutput(deviceId: string, enabled: boolean) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.output, boolValue(enabled));
    }

    setDvr(deviceId: string, enabled: boolean) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.dvr, boolValue(enabled));
    }

    setWebasto(deviceId: string, enabled: boolean) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.webasto, boolValue(enabled));
    }

    webastoOn(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.webastoOn);
    }

    webastoOff(deviceId: string) {
        return this.sendCommandWithAsyncFallback(deviceId, COMMAND_TYPES.webastoOff);
    }

    async runFlexCommand(deviceId: string, index: number) {
        if (!Number.isInteger(index) || index < 1 || index > 9) {
            throw new DisplayableError("Flex command index must be between 1 and 9");
        }

        const result = await this.sendCommandWithAsyncFallback(deviceId, flexCommandType(index));
        return result;
    }

    private sendCommand<T = unknown>(
        deviceId: string,
        type: string,
        value: CommandValue = DEFAULT_COMMAND_VALUE,
        variables?: CommandVariables,
    ) {
        return this.request<T>(commandUrl(deviceId), {
            method: "post",
            body: commandBody(type, value, variables),
        });
    }

    private sendAsyncCommand(
        deviceId: string,
        type: string,
        value: CommandValue = DEFAULT_COMMAND_VALUE,
        variables?: CommandVariables,
    ) {
        return this.request<AsyncCommandResponse>(asyncCommandUrl(deviceId), {
            method: "post",
            body: asyncCommandBody(type, value, variables),
        });
    }

    private async waitForAsyncCommand(
        deviceId: string,
        commandId: string,
        { intervalMs = POLL_INTERVAL_MS, timeoutMs = COMMAND_TIMEOUT_MS }: AsyncCommandOptions = {},
    ) {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() <= deadline) {
            const status = await this.request<AsyncCommandResponse>(asyncCommandUrl(deviceId, commandId));
            if (isDone(status)) {
                return status;
            }
            if (isFailed(status)) {
                throw new AsyncCommandError(asyncError(status));
            }
            await sleep(intervalMs);
        }

        throw new AsyncCommandError("Async command polling timeout");
    }
}
