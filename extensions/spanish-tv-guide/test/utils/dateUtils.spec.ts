import {getTime, isActiveInterval, parseDate} from "../../src/utils/dateUtils";

process.env.TZ = "UTC";

describe("date utils", () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2023-01-01")));

    it("returns date's hours and minutes", () => {
        expect(getTime(new Date("2022-11-29T16:40:45.280Z"))).toEqual("16:40");
        expect(getTime(new Date("2022-11-29T08:22:12.943Z"))).toEqual("08:22");
    });

    it("returns if a date is contained in an interval", () => {
        expect(isActiveInterval(new Date("2023-01-01"), new Date("2023-01-02"))).toBe(true);
        expect(isActiveInterval(new Date("2023-01-02"), new Date("2023-01-03"))).toBe(false);
    });

    it("parses a date in string format using Europe/Madrid time zone", () => {
        expect(parseDate("2022-11-29T16:40:45.280Z")).toEqual(new Date("2022-11-29T16:40:45.280Z"));
        expect(parseDate("2022-11-29T08:22:12.943Z")).toEqual(new Date("2022-11-29T08:22:12.943Z"));
    });
});