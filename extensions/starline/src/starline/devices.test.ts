import { LocalStorage } from "@raycast/api";

import { StarLineDeviceApi } from "./devices";

import type { Devices, Item } from "../types/devices";

const createDevice = (deviceId: number): Item =>
    ({
        device_id: deviceId,
        default: false,
    }) as Item;

class TestStarLineDeviceApi extends StarLineDeviceApi {
    constructor(private readonly response: Devices) {
        super();
    }

    protected auth() {
        return Promise.resolve({ userId: "1", slnetUserToken: "token" });
    }

    protected request<T>(): Promise<T> {
        return Promise.resolve(this.response as T);
    }
}

class RequestRecordingDeviceApi extends StarLineDeviceApi {
    readonly requests: Array<{ url: string; options?: { method?: string; body?: unknown } }> = [];

    protected request<T>(url: string, options?: { method?: string; body?: unknown }): Promise<T> {
        this.requests.push({ url, options });
        return Promise.resolve({
            code: 200,
            codestring: "OK",
            eventDescriptions: [],
        } as unknown as T);
    }
}

describe("StarLineDeviceApi event library", () => {
    it("loads the event library", async () => {
        const client = new RequestRecordingDeviceApi();

        await client.getEventLibrary();

        expect(client.requests).toEqual([
            { url: "https://developer.starline.ru/json/v3/library/events", options: undefined },
        ]);
    });

    it("loads a single event description", async () => {
        const client = new RequestRecordingDeviceApi();

        await client.getEventDescription(307);

        expect(client.requests).toEqual([
            { url: "https://developer.starline.ru/json/v3/library/events/307", options: undefined },
        ]);
    });
});

describe("StarLineDeviceApi", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("includes shared devices in the returned device list", async () => {
        jest.mocked(LocalStorage.getItem).mockResolvedValue("2");
        const api = new TestStarLineDeviceApi({
            devices: [createDevice(1)],
            shared_devices: [createDevice(2)],
        });

        const { result } = await api.getDevices();

        expect(result.devices).toEqual([
            expect.objectContaining({ device_id: 1, default: false }),
            expect.objectContaining({ device_id: 2, default: true }),
        ]);
        expect(result.shared_devices).toEqual([]);
    });

    it("deduplicates devices appearing in both owned and shared lists", async () => {
        jest.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
        const api = new TestStarLineDeviceApi({
            devices: [createDevice(1), createDevice(2)],
            shared_devices: [createDevice(2), createDevice(3)],
        });

        const { result } = await api.getDevices();

        expect(result.devices.map(({ device_id }) => device_id)).toEqual([1, 2, 3]);
    });
});
