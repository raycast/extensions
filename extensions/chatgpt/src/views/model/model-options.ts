export function getModelOptions(models: readonly string[], currentValue = "", searchText = "") {
  const values = new Set(models.filter((model) => model.trim().length > 0));
  if (currentValue) {
    values.add(currentValue);
  }

  const options = Array.from(values, (value) => ({ value, title: value }));
  const customValue = searchText.trim();
  if (customValue && !values.has(customValue)) {
    options.push({ value: customValue, title: `Use "${customValue}"` });
  }
  return options;
}
