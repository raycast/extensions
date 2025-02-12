import { findNoteByName, trimLines } from "./helper";

describe("helper", () => {
  it("finds valid note", () => {
    expect(findNoteByName("C#")).toEqual("C#");
  });

  it("trims the lines", () => {
    const expectedLines = ["# This is title", "This is paragraph", "- This is list"];

    expect(
      trimLines(`
        # This is title
        This is paragraph
        - This is list
      `).join("\n"),
    ).toEqual(expectedLines.join("\n"));
  });
});
