import { showToast } from "@raycast/api";
import React from "react";
import { act, create } from "react-test-renderer";

import LbsPositionForm from "./LbsPositionForm";
import { StarLineProvider } from "../context/starline";
import { StarLine } from "../starline/api";

import type { ReactTestRenderer } from "react-test-renderer";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("LbsPositionForm", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown) => {
            if (typeof message === "string" && message.includes("react-test-renderer is deprecated")) {
                return;
            }
            process.stderr.write(`${String(message)}\n`);
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks();
    });

    function renderForm() {
        let renderer: ReactTestRenderer | undefined;
        act(() => {
            renderer = create(
                <StarLineProvider>
                    <LbsPositionForm />
                </StarLineProvider>,
            );
        });
        if (renderer === undefined) {
            throw new Error("Renderer was not created");
        }
        return renderer;
    }

    function getOnSubmit(renderer: ReactTestRenderer) {
        const form = renderer.root.findByType("Form");
        const actionsEl = form.props.actions as React.ReactElement;
        return (actionsEl.props.children as React.ReactElement<{ onSubmit: () => Promise<void> }>).props.onSubmit;
    }

    it("shows failure toast and calls neither API method when required fields are empty", async () => {
        const getLbsSpy = jest.spyOn(StarLine.prototype, "getLbsPosition");
        const getLbsPositionsSpy = jest.spyOn(StarLine.prototype, "getLbsPositions");
        const renderer = renderForm();

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getLbsSpy).not.toHaveBeenCalled();
        expect(getLbsPositionsSpy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith("failure", expect.any(String), expect.any(String));
    });

    it("shows failure toast when required fields contain non-integer values", async () => {
        const getLbsSpy = jest.spyOn(StarLine.prototype, "getLbsPosition");
        const getLbsPositionsSpy = jest.spyOn(StarLine.prototype, "getLbsPositions");
        const renderer = renderForm();

        const fields = renderer.root.findAllByType("Form.TextField");
        const mccField = fields[0];
        const mncField = fields[1];
        const lacField = fields[2];
        const cidField = fields[3];

        const changeField = (field: (typeof fields)[0], value: string) =>
            (field.props.onChange as (v: string) => void)(value);

        act(() => {
            changeField(mccField, "abc");
            changeField(mncField, "10");
            changeField(lacField, "100");
            changeField(cidField, "1000");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getLbsSpy).not.toHaveBeenCalled();
        expect(getLbsPositionsSpy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith("failure", expect.any(String), expect.any(String));
    });

    function fillRequiredFields(renderer: ReactTestRenderer) {
        const fields = renderer.root.findAllByType("Form.TextField");
        const changeField = (field: (typeof fields)[0], value: string) =>
            (field.props.onChange as (v: string) => void)(value);
        act(() => {
            changeField(fields[0], "250");
            changeField(fields[1], "1");
            changeField(fields[2], "7777");
            changeField(fields[3], "12345");
        });
        return fields;
    }

    it("calls getLbsPosition without PWR when all required fields are valid integers", async () => {
        const getLbsSpy = jest.spyOn(StarLine.prototype, "getLbsPosition").mockResolvedValue({
            code: 200,
            codestring: "OK",
            gps: { lat: 55.7, lon: 37.6, r: 100 },
        });

        const renderer = renderForm();
        fillRequiredFields(renderer);

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getLbsSpy).toHaveBeenCalledWith({ mcc: 250, mnc: 1, lac: 7777, cid: 12345 });
    });

    it("shows failure toast and calls neither API method when PWR is non-integer", async () => {
        const getLbsSpy = jest.spyOn(StarLine.prototype, "getLbsPosition");
        const getLbsPositionsSpy = jest.spyOn(StarLine.prototype, "getLbsPositions");
        const renderer = renderForm();
        const fields = fillRequiredFields(renderer);

        act(() => {
            (fields[4].props.onChange as (v: string) => void)("abc");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getLbsSpy).not.toHaveBeenCalled();
        expect(getLbsPositionsSpy).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith("failure", expect.any(String), expect.any(String));
    });

    it("calls getLbsPositions with PWR when all fields including PWR are valid integers", async () => {
        const getLbsSpy = jest.spyOn(StarLine.prototype, "getLbsPosition");
        const getLbsPositionsSpy = jest.spyOn(StarLine.prototype, "getLbsPositions").mockResolvedValue({
            code: 200,
            codestring: "OK",
            gps: { lat: 55.7, lon: 37.6, r: 100 },
        });

        const renderer = renderForm();
        const fields = fillRequiredFields(renderer);

        act(() => {
            (fields[4].props.onChange as (v: string) => void)("-75");
        });

        const onSubmit = getOnSubmit(renderer);

        await act(async () => {
            await onSubmit();
            await flushPromises();
        });

        expect(getLbsPositionsSpy).toHaveBeenCalledWith({
            lbs_data: [{ mcc: 250, mnc: 1, lac: 7777, cid: 12345, pwr: -75 }],
        });
        expect(getLbsSpy).not.toHaveBeenCalled();
    });
});
