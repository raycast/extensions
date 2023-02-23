"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDeepMemo = void 0;
const react_1 = require("react");
const lite_1 = require("dequal/lite");
/**
 * @param value the value to be memoized (usually a dependency list)
 * @returns a memoized version of the value as long as it remains deeply equal
 */
function useDeepMemo(value) {
    const ref = (0, react_1.useRef)(value);
    const signalRef = (0, react_1.useRef)(0);
    if (!(0, lite_1.dequal)(value, ref.current)) {
        ref.current = value;
        signalRef.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return (0, react_1.useMemo)(() => ref.current, [signalRef.current]);
}
exports.useDeepMemo = useDeepMemo;
