import * as path from "path";

export function delayOperation(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function truncatePath_disp(filePath: string): string {
  const components = filePath.split(path.sep);
  if (components.length >= 2) {
    return ".../" + path.join(components[components.length - 2], components[components.length - 1]);
  } else {
    // In case there are fewer than two components, return the entire path.
    return filePath;
  }
}
