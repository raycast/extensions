import { formatSelectFields, groupBy, createMarkdownTable } from ".";

describe("util functions", () => {
  it("can select & format fields based on boolean flag", () => {
    expect(formatSelectFields({ result_info: true, starting_at: true })).toBe(
      "result_info,starting_at",
    );

    expect(formatSelectFields({ result_info: false, starting_at: true })).toBe(
      "starting_at",
    );
  });

  it("will return an emprty string of field flags are false", () => {
    expect(formatSelectFields({ result_info: false, starting_at: false })).toBe(
      "",
    );
  });

  it("can create a markdown table from a 2 dimensional array of data", () => {
    const markdown = createMarkdownTable([
      ["Name", "Age", "Gender"],
      ["Eddie", 27, "Male"],
    ]);
    const expectedMarkdown =
      "| Name | Age | Gender |\n" +
      "|---- |--- |------ |\n" +
      "| Eddie | 27 | Male |\n";
    expect(markdown).toBe(expectedMarkdown);
  });

  it("can group objects together by common prop", () => {
    expect(
      groupBy(
        [
          {
            name: "Eddie",
            gender: "male",
          },
          {
            name: "Sam",
            gender: "male",
          },
          {
            name: "Olivia",
            gender: "female",
          },
        ],
        "gender",
      ),
    ).toEqual({
      male: [
        {
          name: "Eddie",
          gender: "male",
        },
        {
          name: "Sam",
          gender: "male",
        },
      ],
      female: [
        {
          name: "Olivia",
          gender: "female",
        },
      ],
    });
  });
});
