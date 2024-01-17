import {
  Action,
  ActionPanel,
  Form,
  Toast,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { useEffect } from "react";
import Output from "./Output";
import { Prompt } from "./types";
import { GetCreateNextAppCommand, GetDefaultPrompt, GetExecutableInfo, PathExists } from "./utils";

const initialValues = GetDefaultPrompt("input");
const preferences = getPreferenceValues<Preferences.Index>();
const { executable, command } = GetCreateNextAppCommand({ packageManager: preferences["package-manager"] });

export default function Input() {
  const [executableInfo, setExecutableInfo] = useCachedState<Awaited<ReturnType<typeof GetExecutableInfo>>>(
    `executableInfo:${executable}`,
  );
  useEffect(() => {
    GetExecutableInfo(executable).then(setExecutableInfo);
  }, [executable, setExecutableInfo]);

  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Prompt<"input">>({
    async onSubmit(values) {
      if (!executableInfo?.path) {
        showToast({
          style: Toast.Style.Failure,
          title: `${executable.toUpperCase()} Error`,
          message: `Package manager not found in path.`,
          primaryAction: {
            title: "Open Preferences",
            onAction: openCommandPreferences,
          },
        });
        return false;
      } else {
        push(
          <Output
            prompt={Prompt.parse(values)}
            command={{ executable: executableInfo.path, arguments: command }}
            environment={executableInfo.environment}
          />,
        );
      }
    },
    initialValues: initialValues,
    validation: {
      workspace: (value) =>
        value && Prompt.shape.workspace.safeParse(value).success
          ? PathExists({ path: value[0], type: "Directory" })
            ? undefined
            : "Folder Not Found"
          : "Required",
      project: (value) => (Prompt.shape.project.safeParse(value).success ? undefined : "Required"),
      importAlias: (value) =>
        value ? (Prompt.shape.importAlias.safeParse(value).success ? undefined : "<prefix>/*") : "Required",
    },
  });

  return (
    <Form
      isLoading={!executableInfo}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create App" onSubmit={handleSubmit} />
          {preferences["workspace"] === undefined && (
            <Action title="Set Default Workspace Folder" onAction={openCommandPreferences} />
          )}
        </ActionPanel>
      }
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://nextjs.org/docs/app/api-reference/create-next-app#non-interactive"
          text="Open Documentation"
        />
      }
    >
      <Form.Description title="Package Manager" text={executableInfo?.path || "Loading..."} />
      {preferences["workspace"] === undefined && (
        <Form.Description text="Set your default workspace folder in the settings." />
        // ⌘🅺 // ⇧⌘↵
      )}
      <Form.FilePicker
        title="Workspace Folder"
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
        {...itemProps.workspace}
      />

      <Form.TextField title="Project Name" placeholder={"my-app"} autoFocus {...itemProps.project} />
      <Form.TextField title="Import Alias" placeholder="@/*" info="<prefix>/*" {...itemProps.importAlias} />
      <Form.Checkbox title="TypeScript" label="Initialize as a TypeScript project." {...itemProps.typescript} />
      <Form.Checkbox
        title="Tailwind"
        label="Setup tailwind and postcss configuration files."
        info="*.config.js"
        {...itemProps.tailwind}
      />
      <Form.Checkbox
        title="ESLint"
        label="Initialize ESLint with a strict rule-set alongside the base config."
        info="next/core-web-vitals"
        {...itemProps.eslint}
      />
      <Form.Checkbox
        title="Prettier"
        label="Setup ESLint to work alongside Prettier."
        info="eslint-config-prettier"
        {...itemProps.prettier}
      />
      <Form.Checkbox
        title="App Router"
        label="Use the new App Router built on React Server Components."
        {...itemProps.app}
      />
      <Form.Checkbox
        title="src Directory"
        label="Separate application code from project configuration files."
        info="app, lib, components, etc."
        {...itemProps.srcDir}
      />
    </Form>
  );
}
