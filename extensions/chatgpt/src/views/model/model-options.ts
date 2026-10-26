function matchesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function getModelOptions(models: readonly string[], currentValue = "", searchText = "") {
  const values = new Set(models.map((model) => model.trim()).filter((model) => model.length > 0));
  if (currentValue) {
    values.add(currentValue);
  }

  const query = searchText.trim().toLowerCase();
  const options = Array.from(values)
    // Keep the selected value in the list so the controlled dropdown always has a matching item.
    .filter((value) => !query || value === currentValue || matchesSearch(value, query))
    .map((value) => ({ value, title: value }));

  const customValue = searchText.trim();
  if (customValue && !values.has(customValue)) {
    options.push({ value: customValue, title: `Use "${customValue}"` });
  }
  return options;
}
