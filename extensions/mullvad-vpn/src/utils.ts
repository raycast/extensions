interface RelayOption {
  name: string;
  id: string;
  children?: RelayOption[];
}

export function parseRelayListLine(line: string) {
  const [match, name, id] = line.match(/^\s*(.+?)\s+\((\w{2,3})\)/) || [];

  if (!match) {
    throw new Error("Invalid command format.");
  }

  return { name, id };
}

export function parseRelayList(data: string): RelayOption[] {
  const options: RelayOption[] = [];
  let currentOption: RelayOption | undefined;

  for (const line of data?.split(/\r?\n/) || []) {
    if (!line || /^\t{2}[^\t]/.test(line)) continue;

    const isChild = line.startsWith("\t");

    if (!isChild) {
      currentOption = {
        ...parseRelayListLine(line),
        children: [],
      };
      options.push(currentOption);
    } else if (currentOption) {
      currentOption.children?.push(parseRelayListLine(line));
    }
  }

  return options;
}
