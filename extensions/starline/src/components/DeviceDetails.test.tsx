import { act, create } from "react-test-renderer";

import DeviceDetails from "./DeviceDetails";

import type { Item } from "../types/devices";

const item = {
    device_id: 1,
    alias: "Car",
    phone: "",
    car_state: {
        arm: false,
        alarm: false,
        run: false,
        ign: false,
        valet: false,
        webasto: false,
        door: false,
        hood: false,
        trunk: false,
        hbrake: false,
        shock_bpass: false,
        tilt_bpass: false,
        add_sens_bpass: false,
    },
    functions: [],
    ctemp: 20,
    etemp: 30,
    battery: "12.4",
    gsm_lvl: "5",
    position: {},
    imei: "",
    sn: "",
    type: "car",
    typename: "",
    fw_version: "",
} as Item;

describe("DeviceDetails", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown) => {
            if (typeof message === "string" && message.includes("react-test-renderer is deprecated")) {
                return;
            }
            process.stderr.write(`${String(message)}\n`);
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("renders when optional balance fields are missing", () => {
        expect(() => {
            act(() => {
                create(<DeviceDetails item={item} />);
            });
        }).not.toThrow();
    });
});
