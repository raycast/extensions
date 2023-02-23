"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLatest = void 0;
const react_1 = require("react");
/**
 * Returns the latest state.
 *
 * This is mostly useful to get access to the latest value of some props or state inside an asynchronous callback, instead of that value at the time the callback was created from.
 */
function useLatest(value) {
    const ref = (0, react_1.useRef)(value);
    ref.current = value;
    return ref;
}
exports.useLatest = useLatest;
