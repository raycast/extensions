import { StarLineCommands } from "./commands";

import type { AsyncCommandResponse } from "../types/starline";

type RecordedRequest = { url: string; options?: { body?: unknown } };

class TestStarLineCommands extends StarLineCommands {
    readonly requests: RecordedRequest[] = [];

    constructor(private readonly responses: unknown[]) {
        super();
    }

    protected request<T>(url: string, options?: { body?: unknown }): Promise<T> {
        this.requests.push({ url, options });
        const response = this.responses.shift();

        if (response instanceof Error) {
            return Promise.reject(response);
        }

        return Promise.resolve(response as T);
    }
}

const asyncResponse = (status: AsyncCommandResponse["status"]): AsyncCommandResponse => ({
    code: 200,
    codestring: "OK",
    status,
});

describe("StarLineCommands", () => {
    it("does not fallback to legacy command when async command returns device failure", async () => {
        const client = new TestStarLineCommands([asyncResponse(4)]);

        await expect(client.sendCommandWithAsyncFallback("42", "poke", 1)).rejects.toThrow(
            "Device is offline",
        );

        expect(client.requests).toHaveLength(1);
    });

    it("throws when async response has no cmd_id and is not done or failed", async () => {
        const client = new TestStarLineCommands([{ code: 200, codestring: "OK", status: 1 }]);

        await expect(client.sendCommandWithAsyncFallback("42", "poke", 1)).rejects.toThrow(
            "Async command response does not contain command id",
        );

        expect(client.requests).toHaveLength(1);
    });

    it("does not fallback to legacy command after async command has been accepted", async () => {
        const client = new TestStarLineCommands([
            { ...asyncResponse(1), cmd_id: "command-1" },
            new Error("status network failed"),
            {},
        ]);

        await expect(client.sendCommandWithAsyncFallback("42", "poke", 1)).rejects.toThrow(
            "status network failed",
        );

        expect(client.requests).toHaveLength(2);
        expect(client.requests.map(({ url }) => url)).toEqual([
            expect.stringContaining("/v2/device/42/async"),
            expect.stringContaining("/v2/device/42/async/command-1"),
        ]);
    });

    it("uses explicit quiet arm command types", async () => {
        const client = new TestStarLineCommands([{}, {}]);

        await client.armQuietly("42");
        await client.disarmQuietly("42");

        expect(client.requests.map(({ options }) => options?.body)).toEqual([
            { type: "arm_start_quiet", arm_start_quiet: 1 },
            { type: "arm_stop_quiet", arm_stop_quiet: 1 },
        ]);
    });

    it("builds typed toggle command bodies", async () => {
        const client = new TestStarLineCommands([
            asyncResponse(2),
            asyncResponse(2),
            asyncResponse(2),
            asyncResponse(2),
        ]);

        await client.setIgnition("42", true);
        await client.setIgnition("42", false);
        await client.setHandsFree("42", true);
        await client.setHandsFree("42", false);

        expect(client.requests.map(({ options }) => options?.body)).toEqual([
            { type: "ign", value: 1 },
            { type: "ign", value: 0 },
            { type: "hfree", value: 1 },
            { type: "hfree", value: 0 },
        ]);
    });

    it("builds sync fallback hijack body with PIN variables", async () => {
        const client = new TestStarLineCommands([new Error("async failed"), {}]);

        await client.setHijackMode("42", false, "1234");

        expect(client.requests.map(({ options }) => options?.body)).toEqual([
            { type: "hijack", value: 0, variables: { pin_code: "1234" } },
            { type: "hijack", hijack: 0, variables: [{ pin_code: "1234" }] },
        ]);
    });

    it("rejects empty hijack PIN", async () => {
        const client = new TestStarLineCommands([]);

        await expect(client.setHijackMode("42", true, "   ")).rejects.toThrow(
            "Hijack PIN is required",
        );
        expect(client.requests).toHaveLength(0);
    });

    it("builds balance and flex command bodies", async () => {
        const client = new TestStarLineCommands([asyncResponse(2), asyncResponse(2)]);

        await client.getBalance("42", 2);
        await client.runFlexCommand("42", 9);

        expect(client.requests.map(({ options }) => options?.body)).toEqual([
            { type: "getbalance", value: 2 },
            { type: "flex_9", value: 1 },
        ]);
    });

    it("rejects invalid flex command index", async () => {
        const client = new TestStarLineCommands([]);

        await expect(client.runFlexCommand("42", 10)).rejects.toThrow(
            "Flex command index must be between 1 and 9",
        );
        expect(client.requests).toHaveLength(0);
    });
});
