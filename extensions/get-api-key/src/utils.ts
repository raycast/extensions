export const parseToJSON = (text: string) => {
  const lines = text.split("\n").filter((line) => line.includes(" - "));

  return lines.map((line) => {
    const [key, name, domain] = line.split(" - ");

    return { key, name, domain };
  });
};

export const findApiKey = (searchString: string, dataset: { domain: string; name: string; key: string }[]) =>
  dataset.filter(
    ({ name, domain }) =>
      name.toLowerCase().includes(searchString.toLowerCase()) ||
      domain.toLowerCase().includes(searchString.toLowerCase()),
  );

export const findByApiKey = (apiKey: string, dataset: { domain: string; name: string; key: string }[]) =>
  dataset.find(({ key }) => key === apiKey);
