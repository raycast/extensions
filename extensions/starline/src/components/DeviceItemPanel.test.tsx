import { act, create } from "react-test-renderer";

import type { ReactTestRenderer } from "react-test-renderer";

import DevicesItemContext from "./context/deviceItem";
import DevicesItemActionPanel from "./DeviceItemPanel";

import type { Item } from "../types/devices";

const item: Item = {
    object: "item",
    default: false,
    device_id: 1,
    alias: "Test Car",
    imei: "",
    sn: "",
    phone: "",
    battery: "",
    ctemp: 0,
    etemp: 0,
    fw_version: "",
    gsm_lvl: "",
    mon_type: "",
    status: "",
    ts_activity: "",
    type: "",
    typename: "",
    mayak_temp: "",
    position: {
        x: "",
        y: "",
        ts: "",
        r: "",
    },
    reg_date: "",
    balance: {
        active: {
            value: "",
            currency: "",
            operator: "",
            ts: "",
            state: "",
        },
    },
    car_alr_state: {
        door: false,
        hbrake: false,
        hood: false,
        ign: false,
        pbrake: false,
        shock_h: false,
        shock_l: false,
        tilt: false,
        trunk: false,
    },
    car_state: {
        alarm: false,
        out: false,
        arm: false,
        door: false,
        hbrake: false,
        hijack: false,
        hood: false,
        ign: false,
        r_start: false,
        run: false,
        trunk: false,
        valet: false,
        webasto: false,
        tilt_bpass: false,
        shock_bpass: false,
        add_sens_bpass: false,
        dvr: false,
    },
    functions: ["hfree"],
    controls: [{ position: 1, type: "hfree" }],
};

const permissiveItem: Item = { ...item, functions: [], controls: [] };

function renderPanel(subject: Item) {
    let renderer: ReactTestRenderer | undefined;

    act(() => {
        renderer = create(
            <DevicesItemContext.Provider value={subject}>
                <DevicesItemActionPanel />
            </DevicesItemContext.Provider>,
        );
    });

    if (renderer === undefined) {
        throw new Error("Renderer was not created");
    }

    return renderer.root
        .findAll((node) => node.type === "Action")
        .map((node) => String(node.props.title));
}

describe("DevicesItemActionPanel", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown) => {
            if (
                typeof message === "string" &&
                message.includes("react-test-renderer is deprecated")
            ) {
                return;
            }
            process.stderr.write(`${String(message)}\n`);
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("renders outside DevicesProvider", () => {
        expect(() => {
            act(() => {
                create(
                    <DevicesItemContext.Provider value={item}>
                        <DevicesItemActionPanel />
                    </DevicesItemContext.Provider>,
                );
            });
        }).not.toThrow();
    });

    it("hides unsupported primary commands", () => {
        const actionTitles = renderPanel(item);

        expect(actionTitles).toContain("Enable Hands Free");
        expect(actionTitles).not.toContain("Arm");
        expect(actionTitles).not.toContain("Start Engine");
    });

    it("hides unsupported advanced commands when device has explicit capabilities", () => {
        const actionTitles = renderPanel(item);

        expect(actionTitles).not.toContain("Panic");
        expect(actionTitles).not.toContain("Get SIM 1 Balance");
        expect(actionTitles).not.toContain("Flex 9");
    });

    it("shows all advanced command titles for permissive device", () => {
        const actionTitles = renderPanel(permissiveItem);

        expect(actionTitles).toContain("Enable Hands Free");
        expect(actionTitles).toContain("Panic");
        expect(actionTitles).toContain("Get SIM 1 Balance");
        expect(actionTitles).toContain("Flex 9");
    });

    it("hides advanced JSON mutation forms outside development", () => {
        let renderer: ReactTestRenderer | undefined;

        act(() => {
            renderer = create(
                <DevicesItemContext.Provider value={item}>
                    <DevicesItemActionPanel />
                </DevicesItemContext.Provider>,
            );
        });

        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }

        const advancedJsonSections = renderer.root.findAll(
            (node) =>
                node.type === "ActionPanel.Section" &&
                node.props.title === "Settings / Advanced JSON Forms",
        );

        expect(advancedJsonSections).toHaveLength(0);
    });
});
