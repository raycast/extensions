import pretty from "pretty";

function prettifySvg(svg: string): string {
  return pretty(svg);
}

export { prettifySvg };
