import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";

type CommandType = "create" | "add";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "deno";

function get_base_command(packageManager: PackageManager) {
  let command = "npx ";
  if (packageManager === "pnpm") {
    command = "pnpm dlx ";
  } else if (packageManager === "yarn") {
    command = "yarn dlx ";
  } else if (packageManager === "bun") {
    command = "bunx ";
  } else if (packageManager === "deno") {
    command = "deno run npm:";
  }
  return command + "sv ";
}

export default function Command() {
  const [command_type, set_command_type] = useState<CommandType>("create");

  // sv create options
  const [project_path, set_project_path] = useState<string>("my-app");
  const [template, set_template] = useState<string>("minimal");
  const [types, set_types] = useState<string>("ts");
  const [package_manager, set_package_manager] = useState<PackageManager>("npm");
  const [skip_install, set_skip_install] = useState<boolean>(false);
  const [skip_addons_check, set_skip_addons_checks] = useState<boolean>(false);

  // sv add options
  const [selected_addons, set_selected_addons] = useState<string[]>([]);

  const skip_addons = skip_addons_check || selected_addons.length > 0;

  let command = get_base_command(package_manager);

  if (command_type === "create") {
    command += "create";

    // Add project path FIRST (required)
    command += ` ${project_path}`;

    // Add template option (always show)
    command += ` --template ${template}`;

    // Add types option
    if (types === "none") {
      command += " --no-types";
    } else if (types === "ts") {
      command += " --types ts";
    } else if (types === "jsdoc") {
      command += " --types jsdoc";
    }

    // Add package manager option
    if (package_manager !== "npm") {
      command += ` --install ${package_manager}`;
    }

    // Add no-install flag
    if (skip_install) {
      command += " --no-install";
    }

    // Add no-add-ons flag
    if (skip_addons) {
      command += " --no-add-ons";
    }
  } else {
    // sv add command
    command += "add";
    // Add space-separated add-ons
  }

  if (selected_addons.length > 0) {
    if (command_type === "create") {
      command += ` && ${get_base_command(package_manager)}add`;
    }
    command += ` ${selected_addons.join(" ")}`;
  }

  const package_manager_ui = (
    <Form.Dropdown
      id="packageManager"
      title="Package Manager"
      value={package_manager}
      onChange={(value) => set_package_manager(value as PackageManager)}
      info="Which package manager to use"
    >
      <Form.Dropdown.Item value="npm" title="npm" icon={Icon.Box} />
      <Form.Dropdown.Item value="pnpm" title="pnpm" icon={Icon.Box} />
      <Form.Dropdown.Item value="yarn" title="yarn" icon={Icon.Box} />
      <Form.Dropdown.Item value="bun" title="bun" icon={Icon.Bolt} />
      <Form.Dropdown.Item value="deno" title="deno" icon={Icon.Bolt} />
    </Form.Dropdown>
  );

  async function handle_copy_command() {
    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Command copied!",
      message: "Paste it in your terminal",
    });
  }

  async function handle_copy_and_paste() {
    await Clipboard.paste(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Command pasted!",
      message: "Check your terminal",
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Copy Command" icon={Icon.Clipboard} onAction={handle_copy_command} />
          <Action
            title="Copy & Paste to Terminal"
            icon={Icon.Terminal}
            onAction={handle_copy_and_paste}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.OpenInBrowser
            title="Open CLI Docs"
            url="https://svelte.dev/docs/cli/overview"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
    >
      {/* Live Preview */}
      <Form.Description title="Generated Command" text={command} />

      <Form.Separator />

      {/* Command Type Selection */}
      <Form.Dropdown
        id="commandType"
        title="Command Type"
        value={command_type}
        onChange={(value) => set_command_type(value as CommandType)}
      >
        <Form.Dropdown.Item value="create" title="sv create - Create new project" icon={Icon.Plus} />
        <Form.Dropdown.Item value="add" title="sv add - Add integrations" icon={Icon.Box} />
      </Form.Dropdown>

      <Form.Separator />

      {/* sv create options */}
      {command_type === "create" && (
        <>
          <Form.TextField
            id="projectPath"
            title="Project Name"
            placeholder="my-app"
            value={project_path}
            onChange={set_project_path}
            info="Name of your project directory"
          />

          <Form.Dropdown
            id="template"
            title="Template"
            value={template}
            onChange={set_template}
            info="Choose your project template"
          >
            <Form.Dropdown.Item value="minimal" title="Minimal - Barebones scaffolding" icon={Icon.Document} />
            <Form.Dropdown.Item value="demo" title="Demo - Showcase app with examples" icon={Icon.AppWindowList} />
            <Form.Dropdown.Item value="library" title="Library - Svelte library template" icon={Icon.Box} />
          </Form.Dropdown>

          <Form.Dropdown
            id="types"
            title="TypeScript"
            value={types}
            onChange={set_types}
            info="How to add type checking"
          >
            <Form.Dropdown.Item value="ts" title="TypeScript - .ts files & lang='ts'" icon={Icon.Code} />
            <Form.Dropdown.Item value="jsdoc" title="JSDoc - Type annotations in comments" icon={Icon.Text} />
            <Form.Dropdown.Item
              value="none"
              title="None - No type checking (not recommended)"
              icon={Icon.XMarkCircle}
            />
          </Form.Dropdown>

          {package_manager_ui}

          <Form.Checkbox
            id="skipInstall"
            label="Skip dependency installation"
            value={skip_install}
            onChange={set_skip_install}
            info="Don't install dependencies after creating project"
          />

          <Form.Checkbox
            id="skipAddons"
            label={`Skip add-ons prompt${selected_addons.length > 0 ? " (must be enabled if addons are selected)" : ""}`}
            value={skip_addons}
            onChange={(value) => {
              if (selected_addons.length === 0) {
                set_skip_addons_checks(value);
              }
            }}
            info={`Don't show the interactive add-ons selection during project creation (must be enabled if addons are selected)`}
          />
        </>
      )}

      {/* sv add options */}

      <Form.Description title="Select Add-ons" text="Choose one or more integrations to add to your project" />

      {command_type === "add" ? package_manager_ui : null}

      <Form.TagPicker
        id="addons"
        title="Add-ons"
        value={selected_addons}
        onChange={set_selected_addons}
        placeholder="Select add-ons..."
      >
        <Form.TagPicker.Item value="tailwindcss" title="Tailwind CSS" icon={Icon.Brush} />
        <Form.TagPicker.Item value="drizzle" title="Drizzle ORM" icon={Icon.Coin} />
        <Form.TagPicker.Item value="lucia" title="Lucia Auth" icon={Icon.Lock} />
        <Form.TagPicker.Item value="mdsvex" title="MDsveX (Markdown)" icon={Icon.Document} />
        <Form.TagPicker.Item value="paraglide" title="Paraglide (i18n)" icon={Icon.Globe} />
        <Form.TagPicker.Item value="playwright" title="Playwright (E2E)" icon={Icon.Bug} />
        <Form.TagPicker.Item value="vitest" title="Vitest (Unit Tests)" icon={Icon.CheckCircle} />
        <Form.TagPicker.Item value="prettier" title="Prettier" icon={Icon.Stars} />
        <Form.TagPicker.Item value="eslint" title="ESLint" icon={Icon.Warning} />
        <Form.TagPicker.Item value="storybook" title="Storybook" icon={Icon.Book} />
        <Form.TagPicker.Item value="sveltekit-adapter" title="SvelteKit Adapter" icon={Icon.Plug} />
        <Form.TagPicker.Item value="mcp" title="MCP Server" icon={Icon.Network} />
        <Form.TagPicker.Item value="devtools-json" title="Devtools JSON" icon={Icon.Gear} />
      </Form.TagPicker>

      <Form.Description
        title="💡 Tip"
        text="You can select multiple add-ons. They will be added to your command separated by spaces."
      />

      {/* Copy Button at the end */}
      <Form.Separator />
      <Form.Description
        title="✨ Ready to Copy?"
        text="Press Enter or Cmd+Enter to copy the command to your clipboard!"
      />
    </Form>
  );
}
