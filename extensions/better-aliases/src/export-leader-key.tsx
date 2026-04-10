import { Action, ActionPanel, Detail, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import * as fs from "fs";
import { dirname } from "path";
import { useState } from "react";
import { getBetterAliasesPath } from "./lib/betterAliases";
import { convertAliasesToLeaderKey } from "./lib/conversion";
import { expandPath } from "./lib/expandPath";
import { resolveLeaderKeyConfigPath } from "./lib/leaderKeyConfigPath";
import type { LeaderKeyConfig, Preferences } from "./schemas";
import { betterAliasesConfigSchema } from "./schemas";

interface ExportFormValues {
  betterAliasesPath: string[];
  leaderKeyPath: string[];
}

export default function ExportLeaderKey() {
  const preferences = getPreferenceValues<Preferences>();
  const [exportedConfig, setExportedConfig] = useState<LeaderKeyConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const defaultBetterAliasesPath = getBetterAliasesPath();
  const resolvedLeaderKeyConfigPath = resolveLeaderKeyConfigPath(preferences);

  const { handleSubmit, itemProps, values } = useForm<ExportFormValues>({
    initialValues: {
      betterAliasesPath: [defaultBetterAliasesPath],
      leaderKeyPath: resolvedLeaderKeyConfigPath ? [resolvedLeaderKeyConfigPath] : [],
    },
    onSubmit: async (values) => {
      try {
        const path = expandPath(values.betterAliasesPath[0]);
        if (!fs.existsSync(path)) {
          throw new Error(`File not found at ${path}`);
        }

        const content = fs.readFileSync(path, "utf-8");
        const json = JSON.parse(content);

        const validation = betterAliasesConfigSchema.safeParse(json);
        if (!validation.success) {
          const errorMessages = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
          setErrors(errorMessages);
          return;
        }

        const converted = convertAliasesToLeaderKey(validation.data);
        setExportedConfig(converted);
        setErrors([]);
        await showToast(Toast.Style.Success, "Converted successfully", "You can now save to Leader Key");
      } catch (error) {
        setErrors([(error as Error).message]);
        await showFailureToast(error, { title: "Failed to convert" });
      }
    },
  });

  const handleSave = async () => {
    if (!exportedConfig) return;

    try {
      const leaderKeyPath = values.leaderKeyPath[0];
      if (!leaderKeyPath) {
        throw new Error("Select a Leader Key config file to export to");
      }

      const destPath = expandPath(leaderKeyPath);

      // Ensure directory exists
      const dir = dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(destPath, JSON.stringify(exportedConfig, null, 2), "utf-8");

      await showToast(Toast.Style.Success, "Configuration saved", destPath);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to save" });
    }
  };

  if (errors.length > 0) {
    return (
      <Detail
        markdown={`# Errors during conversion\n\n${errors.map((e) => `- ${e}`).join("\n")}`}
        actions={
          <ActionPanel>
            <Action title="Back to Form" onAction={() => setErrors([])} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {!exportedConfig ? (
            <Action.SubmitForm title="Convert" onSubmit={handleSubmit} icon={Icon.ChevronRight} />
          ) : (
            <>
              <Action title="Save to Leader Key" onAction={handleSave} icon={Icon.SaveDocument} />
              <Action.SubmitForm title="Re-Convert" onSubmit={handleSubmit} icon={Icon.RotateAntiClockwise} />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="Export your Better Aliases configuration to Leader Key format." />
      <Form.FilePicker
        title="Better Aliases Config Path"
        canChooseDirectories={false}
        {...itemProps.betterAliasesPath}
      />
      <Form.FilePicker title="Leader Key Config Path" canChooseDirectories={false} {...itemProps.leaderKeyPath} />

      {exportedConfig && (
        <Form.Description
          text={`Successfully converted ${exportedConfig.actions?.length || 0} top-level actions. Ready to save.`}
        />
      )}
    </Form>
  );
}
