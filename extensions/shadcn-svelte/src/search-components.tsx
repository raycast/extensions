import { useCachedPromise } from "@raycast/utils";
import { showToast } from "@raycast/api";
import { CREATE_ERROR_TOAST_OPTIONS, SHADCN_SVELTE } from "./constants";
import { ofetch } from "ofetch";
import { List, Action, ActionPanel } from "@raycast/api";

type ComponentsData = {
  dependencies: string[];
  files: string[];
  name: string;
  registryDependencies: string[];
  type: string;
};

type ComponentParsedType = {
  name: string;
  component: string;
  url: string;
};

export const parseComponentName = (componentName: string) => {
  return componentName
    .split("-")
    .map((name: string) => name.charAt(0).toUpperCase() + name.slice(1))
    .join(" ");
};

export const parseComponentResponse = (componentsData: ComponentsData[]) => {
  return componentsData.map(({ name }) => {
    return {
      name: parseComponentName(name),
      component: name,
      url: `${SHADCN_SVELTE.COMPONENTS_URL}/${name}`,
    } as ComponentParsedType;
  });
};
const SearchComponents = () => {
  const { isLoading, data: components } = useCachedPromise(
    async (url: string) => {
      const response = await ofetch(url);
      return parseComponentResponse(response);
    },
    [SHADCN_SVELTE.COMPONENTS_API_URL],
    {
      initialData: true,
      onError: async (e) => {
        await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search components...">
      {components?.length &&
        components?.map(({ name, url, component }) => (
          <List.Item
            title={name}
            key={name}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={url} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    icon="npm-icon.png"
                    title="Copy Add Command [Npm]"
                    content={`npx shadcn-svelte@latest add ${component}`}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action.CopyToClipboard
                    icon="yarn-icon.png"
                    title="Copy Add Command [Yarn]"
                    content={`yarn shadcn-svelte@latest add ${component}`}
                    shortcut={{ modifiers: ["cmd"], key: "y" }}
                  />
                  <Action.CopyToClipboard
                    icon="pnpm-icon.png"
                    title="Copy Add Command [Pnpm]"
                    content={`pnpm dlx shadcn-svelte@latest add ${component}`}
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "p" }}
                  />
                  <Action.CopyToClipboard
                    icon="bun-icon.png"
                    title="Copy Add Command [Bun]"
                    content={`bunx --bun shadcn-svelte@latest add ${component}`}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

export default SearchComponents;
