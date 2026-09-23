import { describe, expect, it } from "vitest";
import { contextualizeBenchmarkFailure } from "../src/benchmark/errors";

describe("contextualizeBenchmarkFailure", () => {
  it.each(["EACCES", "EPERM", "EROFS"])("turns %s into a contextual destination error", (code) => {
    const error = Object.assign(new Error("raw file-system failure"), { code });

    expect(contextualizeBenchmarkFailure(error)).toEqual({
      code: "destination_not_writable",
      message: "Raycast cannot write temporary benchmark data to the selected folder. Choose a writable local folder.",
    });
  });
});
