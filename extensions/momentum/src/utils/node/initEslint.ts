import { InitEslint } from "../../typing/initProjectArgs";
import { showLoading } from "../toasts";
import { EslintTemplateData, generateEslintTemplate } from "../generateTemplate";

export const initEslint = async ({ manager, typescript, preset, root }: InitEslint) => {
  await manager.install({ packageName: "eslint", dev: true, root });

  const config: EslintTemplateData = {
    plugins: [],
    extends: [],
  };

  if (typescript) {
    await manager.install({ packageName: "typescript-eslint", dev: true, root });

    if (preset === "author-recommended") {
      await showLoading("getting author-recommended .eslintrc.js");
      await manager.install({
        packageName: "@leondaz/eslint-typescript-recommended",
        dev: true,
        root,
      });
      config.extends.push("@leondaz/eslint-typescript-recommended");
    } else {
      config.extends.push("plugin:@typescript-eslint/recommended");
      config.plugins.push("@typescript-eslint/eslint-plugin");
      config.parser = "@typescript-eslint/parser";
    }
  }

  await showLoading("writing .eslintrc.js");
  await generateEslintTemplate(root, config);
};
