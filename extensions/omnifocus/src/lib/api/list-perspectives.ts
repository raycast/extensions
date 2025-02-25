import { executeScript } from "../utils/executeScript";

export async function listPerspectives(): Promise<{
  names: string[];
  customPerspectives: { id: string; name: string }[];
}> {
  return await executeScript(`


const omnifocus = Application("OmniFocus");

const customPerspectives = omnifocus.perspectives().map((p) => {
  try {
    return {
      id: p.id(),
      name: p.name(),
    };
  } catch (e) {
    return null;
  }
}).filter(Boolean);


const allNames =  omnifocus.perspectiveNames()

return {
  names: allNames,
  customPerspectives
}
`);
}
