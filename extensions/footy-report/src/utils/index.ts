export const formatSelectFields = <T extends Record<string, boolean>>(
  selectFields: T,
) => {
  const selectParams: string[] = [];
  Object.entries(selectFields).forEach(([key, isSelected]) => {
    if (isSelected) {
      selectParams.push(key);
    }
  });
  return selectParams.length > 0 ? selectParams.join(",") : "";
};

export const groupBy = <T extends object, K extends keyof T>(
  array: T[],
  prop: K,
): { [key: string | number | symbol]: T[] } => {
  const map = new Map<T[K], T[]>();
  array.forEach((element) => {
    const groupName = element[prop];
    const group = map.get(groupName);
    if (!group) {
      map.set(groupName, [element]);
    } else {
      map.set(groupName, [...group, element]);
    }
  });
  return map.size > 0 ? Object.fromEntries(map) : {};
};

export const createMarkdownTable = (
  data: [string[], ...(string | number | boolean)[][]],
) => {
  let table = "|";

  // column names
  for (let i = 0; i < data[0].length; i++) {
    table += ` ${data[0][i]} |`;
  }

  table += "\n";
  table += "|";

  // column seperator
  for (let i = 0; i < data[0].length; i++) {
    const columnNameLength = data[0][i].length;
    const seperator = "-".repeat(columnNameLength);
    table += `${seperator} |`;
  }

  table += "\n";

  for (let row = 1; row < data.length; row++) {
    table += "|";
    for (let col = 0; col < data[row].length; col++) {
      table += ` ${data[row][col]} |`;
    }
    table += "\n";
  }

  return table;
};
