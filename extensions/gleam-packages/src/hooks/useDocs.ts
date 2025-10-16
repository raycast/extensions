import { useFetch } from "@raycast/utils";
import { PackageInterface, ModuleInterface, Docs } from "../types";

export default function useDocs(url: string) {
  return useFetch<PackageInterface, undefined, Docs>(`${url}package-interface.json`, {
    mapResult: (result) => ({
      data: docs(result, url),
    }),
  });
}

function docs(pkg: PackageInterface, url: string): Docs {
  const mods = [];
  const types = [];
  const typeAliases = [];
  const constants = [];
  const functions = [];

  for (const [name, module] of Object.entries(pkg.modules)) {
    const md = moduleDocs(name, module, url);
    mods.push(...md.mods);
    types.push(...md.types);
    types.push(...md.typeAliases);
    typeAliases.push(...md.typeAliases);
    constants.push(...md.constants);
    functions.push(...md.functions);
  }
  return {
    mods,
    types,
    typeAliases,
    constants,
    functions,
  };
}

function moduleDocs(name: string, module: ModuleInterface, docURL: string): Docs {
  const url = `${docURL}${name}.html`;

  return {
    mods: [
      {
        module: "",
        name,
        type: "Module",
        documentation: module.documentation.join("\n"),
        url: `${url}`,
      },
    ],
    types: Object.entries(module.types).map(([n, t]) => ({
      module: name,
      name: n,
      type: "Type",
      documentation: t.documentation,
      url: `${url}#${n}`,
    })),
    typeAliases: Object.entries(module["type-aliases"]).map(([n, t]) => ({
      module: name,
      name: n,
      type: "Type",
      documentation: t.documentation,
      url: `${url}#${n}`,
    })),
    constants: Object.entries(module.constants).map(([n, c]) => ({
      module: name,
      name: n,
      type: "Constant",
      documentation: c.documentation,
      url: `${url}#${n}`,
    })),
    functions: Object.entries(module.functions).map(([n, f]) => ({
      module: name,
      name: n,
      type: "Function",
      documentation: f.documentation,
      url: `${url}#${n}`,
    })),
  };
}
