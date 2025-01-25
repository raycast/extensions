import nodePath from "./path";

export async function getOutputPath(input: string, newExt: string | null = null, suffix: string | null = null) {
  const path = nodePath.parse(input);
  const dir = path.dir;
  const name = suffix ? [path.name, suffix].join(" ") : path.name;
  const ext = newExt || path.ext.slice(1);
  const output = await nodePath.genUniquePath(`${dir}/${name}.${ext}`);
  return output;
}
