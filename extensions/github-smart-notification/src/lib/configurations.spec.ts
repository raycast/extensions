import { Configuration, removeConfig } from "./configurations";

describe("removeConfig", () => {
  it("works", () => {
    const config: Configuration = {
      description: "test",
      title: "test",
      repository: "*/*",
      reason: [],
    };
    const etc: Configuration = {
      description: "test2",
      title: "test",
      repository: "*/*",
      reason: [],
    };
    expect(removeConfig(config, [config, etc]).length).toBe(1);
  });
});
