import { describe, expect, it } from "vitest";
import { configureNativeBenchmarkEnvironment } from "../src/benchmark/native-environment";

describe("configureNativeBenchmarkEnvironment", () => {
  it("discards unused LLVM coverage output from the Raycast Swift binary", () => {
    const environment: NodeJS.ProcessEnv = { LLVM_PROFILE_FILE: "default.profraw" };

    configureNativeBenchmarkEnvironment(environment);

    expect(environment.LLVM_PROFILE_FILE).toBe("/dev/null");
  });
});
