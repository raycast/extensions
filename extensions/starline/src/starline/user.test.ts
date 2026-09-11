import { StarLineUserApi } from "./user";

import type { LbsPositionRequest } from "../types/starline";

type RecordedRequest = { url: string; options?: { method?: string; body?: unknown } };

class TestStarLineUserApi extends StarLineUserApi {
    readonly requests: RecordedRequest[] = [];

    protected auth(): Promise<{ userId: string; slnetUserToken: string }> {
        return Promise.resolve({ userId: "user-42", slnetUserToken: "token" });
    }

    protected request<T>(url: string, options?: { method?: string; body?: unknown }): Promise<T> {
        this.requests.push({ url, options });
        return Promise.resolve({ code: 200, codestring: "OK" } as T);
    }
}

describe("StarLineUserApi", () => {
    it("loads user devices with the authenticated user id", async () => {
        const client = new TestStarLineUserApi();

        await client.getUserDevices();

        expect(client.requests).toEqual([
            {
                url: "https://developer.starline.ru/json/v1/user/user-42/devices",
                options: undefined,
            },
        ]);
    });

    it("loads device list and mobile devices", async () => {
        const client = new TestStarLineUserApi();

        await client.getDeviceList();
        await client.getMobileDevices();

        expect(client.requests.map(({ url }) => url)).toEqual([
            "https://developer.starline.ru/json/v1/user/user-42/deviceList",
            "https://developer.starline.ru/json/v1/user/user-42/mobile_devices",
        ]);
    });

    it("builds LBS GET query parameters", async () => {
        const client = new TestStarLineUserApi();

        await client.getLbsPosition({ mcc: 250, mnc: 1, lac: 45001, cid: 2171 });

        expect(client.requests[0]?.url).toBe(
            "https://developer.starline.ru/json/v1/user/user-42/lbs_position?mcc=250&mnc=1&lac=45001&cid=2171",
        );
    });

    it("posts multiple LBS stations", async () => {
        const client = new TestStarLineUserApi();
        const body: LbsPositionRequest = {
            lbs_data: [{ mcc: 250, mnc: 1, lac: 38810, cid: 1182, pwr: -107 }],
        };

        await client.getLbsPositions(body);

        expect(client.requests[0]).toEqual({
            url: "https://developer.starline.ru/json/v1/user/user-42/lbs_position",
            options: { method: "post", body },
        });
    });

    it("supports data transfer get, post, and delete", async () => {
        const client = new TestStarLineUserApi();

        await client.getDataTransfer();
        await client.updateDataTransfer({ address: "https://example.com:4321/" });
        await client.deleteDataTransfer();

        expect(client.requests).toEqual([
            {
                url: "https://developer.starline.ru/json/v1/user/user-42/data_transfer",
                options: undefined,
            },
            {
                url: "https://developer.starline.ru/json/v1/user/user-42/data_transfer",
                options: { method: "post", body: { address: "https://example.com:4321/" } },
            },
            {
                url: "https://developer.starline.ru/json/v1/user/user-42/data_transfer",
                options: { method: "delete" },
            },
        ]);
    });
});
