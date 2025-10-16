import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Clipboard } from "@raycast/api";
import { useForm, useCachedPromise } from "@raycast/utils";
import { CreateAliasFormData, CreateAliasProps } from "../types";
import { validateLabel, validateDescription, extractDomainFromEmail } from "../utils";
import { getApiConfig } from "../services/api/config";
import { getUnusedRules, createRule, updateRule, ensurePoolSize, getAccountDomain } from "../services/cf/rules";

export default function CreateAlias({ alias }: CreateAliasProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const config = getApiConfig();

  // Fetch the correct domain for alias creation
  const { data: domain } = useCachedPromise(async () => {
    try {
      return await getAccountDomain();
    } catch {
      // Fallback to extracting from destination email
      const fallbackDomain = extractDomainFromEmail(config.destinationEmail);

      // Inform user about the fallback
      showToast({
        style: Toast.Style.Failure,
        title: "Domain Fetch Failed",
        message: "Using fallback domain. Check your API configuration.",
      });

      return fallbackDomain;
    }
  });

  const { handleSubmit, itemProps } = useForm<CreateAliasFormData>({
    async onSubmit(values) {
      setIsLoading(true);

      try {
        const labelValidation = validateLabel(values.label);
        if (!labelValidation.isValid) {
          throw new Error(labelValidation.error);
        }

        const descValidation = validateDescription(values.description || "");
        if (!descValidation.isValid) {
          throw new Error(descValidation.error);
        }

        if (!domain) {
          throw new Error("Domain not available. Please check your configuration.");
        }

        const safeDomain = domain as string;

        if (alias) {
          // Edit existing alias
          await updateRule(alias.id, values.label, values.description);
          showToast({
            style: Toast.Style.Success,
            title: "Alias Updated",
            message: `Successfully updated ${alias.email}`,
            primaryAction: {
              title: "Copy Email",
              onAction: () => {
                Clipboard.copy(alias.email);
              },
            },
          });
        } else {
          // Create new alias
          let unusedRules = await getUnusedRules();

          if (unusedRules.length === 0) {
            // No unused rules available, create a new one
            showToast({
              style: Toast.Style.Animated,
              title: "Creating New Alias",
              message: "Generating new email alias...",
            });
            await createRule(safeDomain);
            unusedRules = await getUnusedRules();
          }

          if (unusedRules.length > 0) {
            const ruleToUse = unusedRules[0];
            await updateRule(ruleToUse.id, values.label, values.description);

            showToast({
              style: Toast.Style.Success,
              title: "Alias Created",
              message: `Successfully created ${ruleToUse.email}`,
              primaryAction: {
                title: "Copy Email",
                onAction: () => {
                  Clipboard.copy(ruleToUse.email);
                },
              },
            });

            // Ensure pool size after using a rule
            if (config.preAllocatePool) {
              ensurePoolSize(20).catch((poolError) => {
                console.error("Pool size maintenance failed:", poolError);
                showToast({
                  style: Toast.Style.Failure,
                  title: "Pool Maintenance Warning",
                  message: "Alias created but pool replenishment failed. Next alias creation may be slower.",
                });
              });
            }
          } else {
            throw new Error("Failed to create or find available alias");
          }
        }

        popToRoot();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        showToast({
          style: Toast.Style.Failure,
          title: alias ? "Failed to Update Alias" : "Failed to Create Alias",
          message: errorMessage,
          primaryAction: {
            title: "Copy Error",
            onAction: () => {
              Clipboard.copy(errorMessage);
            },
          },
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      label: alias?.name.label || "",
      description: alias?.name.description || "",
    },
    validation: {
      label: (value) => {
        const validation = validateLabel(value || "");
        return validation.isValid ? undefined : validation.error;
      },
      description: (value) => {
        const validation = validateDescription(value || "");
        return validation.isValid ? undefined : validation.error;
      },
    },
  });

  const handleUseRandomUnused = async () => {
    try {
      if (!domain) {
        throw new Error("Domain not available. Please check your configuration.");
      }

      const safeDomain = domain as string;

      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Finding Available Alias",
        message: "Looking for unused aliases...",
      });

      let unusedRules = await getUnusedRules();

      if (unusedRules.length === 0) {
        showToast({
          style: Toast.Style.Animated,
          title: "Creating New Alias",
          message: "No unused aliases found, creating new one...",
        });
        await createRule(safeDomain);
        unusedRules = await getUnusedRules();
      }

      if (unusedRules.length > 0) {
        const ruleToUse = unusedRules[0];
        await updateRule(ruleToUse.id, "Quick Alias", "Created using random unused alias");

        showToast({
          style: Toast.Style.Success,
          title: "Alias Created",
          message: `Successfully created ${ruleToUse.email}`,
          primaryAction: {
            title: "Copy Email",
            onAction: () => {
              Clipboard.copy(ruleToUse.email);
            },
          },
        });

        // Ensure pool size after using a rule
        if (config.preAllocatePool) {
          ensurePoolSize(20).catch((poolError) => {
            console.error("Pool size maintenance failed:", poolError);
            showToast({
              style: Toast.Style.Failure,
              title: "Pool Maintenance Warning",
              message: "Alias created but pool replenishment failed. Next alias creation may be slower.",
            });
          });
        }

        popToRoot();
      } else {
        throw new Error("Failed to create or find available alias");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Quick Alias",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={alias ? "Update Alias" : "Create Alias"} onSubmit={handleSubmit} />
          {!alias && (
            <Action
              title="Use Random Unused Alias"
              onAction={handleUseRandomUnused}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Label" placeholder="Enter a label for this alias (required)" {...itemProps.label} />
      <Form.TextArea
        title="Description"
        placeholder="Enter a description for this alias (optional)"
        {...itemProps.description}
      />
      <Form.Separator />
      {alias && <Form.Description title="Editing Alias" text={`Email: ${alias.email}`} />}
      <Form.Description title="Destination" text={`Aliases will forward to: ${config.destinationEmail}`} />
      {!alias && <Form.Description title="Domain" text={`New aliases will be created under: ${domain}`} />}
      {!alias && config.preAllocatePool && (
        <Form.Description title="Pool Mode" text="Pre-allocation is enabled - aliases will be created faster" />
      )}
    </Form>
  );
}
