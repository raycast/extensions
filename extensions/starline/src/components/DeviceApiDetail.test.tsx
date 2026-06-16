import { showToast } from "@raycast/api";
import { act, create } from "react-test-renderer";

import DeviceApiDetail from "./DeviceApiDetail";
import { StarLineProvider } from "../context/starline";
import { StarLine } from "../starline/api";

import type { ReactTestRenderer } from "react-test-renderer";
import type { Item } from "../types/devices";

const item = {
    device_id: 42,
    alias: "Car",
    phone: "",
    car_state: {},
    functions: [],
    controls: [],
} as Item;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("DeviceApiDetail", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
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
        jest.restoreAllMocks();
    });

    it("renders an empty controls table when the API omits controls", async () => {
        jest.spyOn(StarLine.prototype, "getControlsLibrary").mockResolvedValue({
            code: 200,
            codestring: "OK",
        });
        let renderer: ReactTestRenderer | undefined;

        await act(async () => {
            renderer = create(
                <StarLineProvider>
                    <DeviceApiDetail item={item} kind="controls" title="Supported Controls" />
                </StarLineProvider>,
            );
            await flushPromises();
        });

        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }

        const detail = renderer.root.findByType("Detail");
        expect(detail.props.markdown).toContain("| Command | Title |");
        expect(showToast).not.toHaveBeenCalled();
    });

    it("renders an empty event library table when the API omits descriptions", async () => {
        jest.spyOn(StarLine.prototype, "getEventLibrary").mockResolvedValue({
            code: 200,
            codestring: "OK",
        });
        let renderer: ReactTestRenderer | undefined;

        await act(async () => {
            renderer = create(
                <StarLineProvider>
                    <DeviceApiDetail item={item} kind="eventLibrary" title="Event Library" />
                </StarLineProvider>,
            );
            await flushPromises();
        });

        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }

        const detail = renderer.root.findByType("Detail");
        expect(detail.props.markdown).toContain("| Code | Group | Description |");
        expect(showToast).not.toHaveBeenCalled();
    });
});
