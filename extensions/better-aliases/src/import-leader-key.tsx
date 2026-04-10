import { Action, ActionPanel, Detail, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import * as fs from "fs";
import { useState } from "react";
import { getBetterAliasesPath, loadBetterAliases } from "./lib/betterAliases";
import { convertLeaderKeyToAliases } from "./lib/conversion";
import { expandPath } from "./lib/expandPath";
import { resolveLeaderKeyConfigPath } from "./lib/leaderKeyConfigPath";
import type { BetterAliasesConfig, Preferences } from "./schemas";
import { betterAliasesConfigSchema, leaderKeyConfigSchema } from "./schemas";

interface ImportFormValues {
  leaderKeyPath: string[];
  betterAliasesPath: string[];
  conflictStrategy: string;
}

export default function ImportLeaderKey() {
  const preferences = getPreferenceValues<Preferences>();
  const [importedConfig, setImportedConfig] = useState<BetterAliasesConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const defaultBetterAliasesPath = getBetterAliasesPath();
  const resolvedLeaderKeyConfigPath = resolveLeaderKeyConfigPath(preferences);

  const { handleSubmit, itemProps, values } = useForm<ImportFormValues>({
    initialValues: {
      leaderKeyPath: resolvedLeaderKeyConfigPath ? [resolvedLeaderKeyConfigPath] : [],
      betterAliasesPath: [defaultBetterAliasesPath],
      conflictStrategy: "merge",
    },
    onSubmit: async (values) => {
      try {
        const leaderKeyPath = values.leaderKeyPath[0];
        if (!leaderKeyPath) {
          throw new Error("Select a Leader Key config file to import");
        }

        const path = expandPath(leaderKeyPath);
        if (!fs.existsSync(path)) {
          throw new Error(`File not found at ${path}`);
        }

        const content = fs.readFileSync(path, "utf-8");
        const json = JSON.parse(content);

        const validation = leaderKeyConfigSchema.safeParse(json);
        if (!validation.success) {
          const errorMessages = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
          setErrors(errorMessages);
          return;
        }

        const converted = convertLeaderKeyToAliases(validation.data);
        setImportedConfig(converted);
        setErrors([]);
        await showToast(Toast.Style.Success, "Imported successfully", "You can now save the configuration");
      } catch (error) {
        setErrors([(error as Error).message]);
        await showFailureToast(error, { title: "Failed to import" });
      }
    },
  });

  const handleSave = async () => {
    if (!importedConfig) return;

    try {
      const destPath = expandPath(values.betterAliasesPath[0]);
      let finalConfig = importedConfig;

      if (values.conflictStrategy === "merge" && fs.existsSync(destPath)) {
        const existingConfig = loadBetterAliases();
        finalConfig = { ...existingConfig, ...importedConfig };
      }

      // Validate before saving
      betterAliasesConfigSchema.parse(finalConfig);

      fs.writeFileSync(destPath, JSON.stringify(finalConfig, null, 2), "utf-8");

      await showToast(Toast.Style.Success, "Configuration saved", destPath);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to save" });
    }
  };

  if (errors.length > 0) {
    return (
      <Detail
        markdown={`# Errors during import\n\n${errors.map((e) => `- ${e}`).join("\n")}`}
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
          {!importedConfig ? (
            <Action.SubmitForm title="Import" onSubmit={handleSubmit} icon={Icon.Download} />
          ) : (
            <>
              <Action title="Save Configuration" onAction={handleSave} icon={Icon.SaveDocument} />
              <Action.SubmitForm title="Re-Import" onSubmit={handleSubmit} icon={Icon.RotateAntiClockwise} />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="Import your Leader Key configuration into Better Aliases." />
      <Form.FilePicker title="Leader Key Config Path" canChooseDirectories={false} {...itemProps.leaderKeyPath} />
      <Form.FilePicker
        title="Better Aliases Config Path"
        canChooseDirectories={false}
        {...itemProps.betterAliasesPath}
      />
      <Form.Dropdown title="Conflict Strategy" {...itemProps.conflictStrategy}>
        <Form.Dropdown.Item value="merge" title="Merge (Keep existing, add/update from Leader Key)" />
        <Form.Dropdown.Item value="overwrite" title="Overwrite (Replace everything)" />
      </Form.Dropdown>

      {importedConfig && (
        <Form.Description
          text={`Successfully imported ${Object.keys(importedConfig).length} aliases. Ready to save.`}
        />
      )}
    </Form>
  );
}
