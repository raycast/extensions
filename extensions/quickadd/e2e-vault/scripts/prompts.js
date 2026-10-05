module.exports = async ({ app, quickAddApi: qa }) => {
  const results = {};
  results.input = await qa.inputPrompt("Title", "A short title");
  results.wide = await qa.wideInputPrompt("Body", "Longer text");
  results.suggester = await qa.suggester(
    ["One", "Two"],
    ["one", "two"],
    "Pick or type a number",
    true,
  );
  results.checkbox = await qa.checkboxPrompt(["x", "y", "z"], ["y"], "Letters");
  results.date = await qa.datePrompt("When", { dateFormat: "YYYY-MM-DD" });
  results.confirm = await qa.yesNoPrompt("Proceed?", "Writes the script output");
  await qa.infoDialog("About to write", ["The script writes its answers next."]);
  results.form = await qa.requestInputs([
    { id: "project", label: "Project", type: "text" },
    { id: "notes", label: "Notes", type: "textarea", optional: true },
    { id: "effort", label: "Effort", type: "number", numericConfig: { min: 1, max: 10 } },
    { id: "confidence", label: "Confidence", type: "slider", sliderConfig: { min: 0, max: 100, step: 5 } },
    { id: "status", label: "Status", type: "dropdown", options: ["Todo", "Doing", "Done"] },
    {
      id: "labels",
      label: "Labels",
      type: "suggester",
      options: ["work", "home"],
      suggesterConfig: { multiSelect: true, allowCustomInput: true },
    },
    { id: "start", label: "Start", type: "date", dateFormat: "YYYY-MM-DD" },
  ]);
  const path = "Output/Script output.md";
  const body = JSON.stringify(results, null, 2) + "\n";
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing) await app.vault.modify(existing, body);
  else await app.vault.create(path, body);
};
