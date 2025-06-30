import os from "os";
import { fetchAppleScript, scriptForOtherVersions, scriptForVentura } from "../scripts";

describe("Apple script test suite #1", () => {
  it("should return the appropriate apple script if the system version is greater than 22 (MacOS ventura or after)", () => {
    jest.spyOn(os, "release").mockReturnValue("22.3.0");
    const script = fetchAppleScript();
    expect(script).toEqual(scriptForVentura);
  });

  it("should return the appropriate apple script if the system version is less than 22 (Versions before Ventura)", () => {
    jest.spyOn(os, "release").mockReturnValue("20.0.0");
    const script = fetchAppleScript();
    expect(script).toEqual(scriptForOtherVersions);
  });
});
