import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Clipboard } from "@raycast/api";
import { useForm, useCachedPromise } from "@raycast/utils";
import { CreateAliasFormData, CreateAliasProps } from "../types";
import {
  validateLabel,
  validateDescription,
  extractDomainFromEmail,
  generateRandomSlug,
  validateEmail,
} from "../utils";
import { getApiConfig } from "../services/api/config";
import { getUnusedRules, createRule, updateRule, ensurePoolSize, getAccountDomain } from "../services/cf/rules";

export default function CreateAlias({ alias }: CreateAliasProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const config = getApiConfig();
  const [defaultAliasSlug] = useState(() => {
    const slug = generateRandomSlug();
    return config.aliasPreface ? `${config.aliasPreface}-${slug}` : slug;
  });

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

  const normalizeAliasInput = (input: string, aliasDomain: string): string => {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("Alias is required");
    }

    if (trimmed.includes("@")) {
      const atIndex = trimmed.indexOf("@");
      const lastAtIndex = trimmed.lastIndexOf("@");
      if (atIndex !== lastAtIndex) {
        throw new Error("Alias must include only one @ symbol");
      }
      const localPart = trimmed.slice(0, atIndex);
      const inputDomain = trimmed.slice(atIndex + 1);
      if (!localPart || !inputDomain) {
        throw new Error("Alias must include a valid domain");
      }
      if (inputDomain.toLowerCase() !== aliasDomain.toLowerCase()) {
        throw new Error(`Alias domain must match ${aliasDomain}`);
      }
      return `${localPart}@${aliasDomain}`;
    }

    return `${trimmed}@${aliasDomain}`;
  };

  const validateAlias = (value?: string): string | undefined => {
    if (alias) {
      return undefined;
    }
    if (!value) {
      return "Alias is required";
    }
    if (!domain) {
      return "Domain not available yet";
    }

    try {
      const normalized = normalizeAliasInput(value, domain as string);
      return validateEmail(normalized) ? undefined : "Alias must be a valid email address";
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid alias";
    }
  };

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
          const normalizedAlias = normalizeAliasInput(values.alias, safeDomain);
          if (!validateEmail(normalizedAlias)) {
            throw new Error("Alias must be a valid email address");
          }

          let unusedRules = await getUnusedRules();
          let createdEmail = normalizedAlias;

          if (unusedRules.length > 0) {
            const ruleToUse = unusedRules[0];
            const updatedRule = await updateRule(ruleToUse.id, values.label, values.description, normalizedAlias);
            createdEmail = updatedRule.email;
          } else {
            showToast({
              style: Toast.Style.Animated,
              title: "Creating New Alias",
              message: "Generating new email alias...",
            });
            const createdRule = await createRule(safeDomain, normalizedAlias, values.label, values.description);
            createdEmail = createdRule.email;
            unusedRules = await getUnusedRules();
          }

          await Clipboard.copy(createdEmail);
          showToast({
            style: Toast.Style.Success,
            title: "Alias Created",
            message: `Copied ${createdEmail} to clipboard`,
            primaryAction: {
              title: "Copy Email",
              onAction: () => {
                Clipboard.copy(createdEmail);
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
      alias: alias?.email || defaultAliasSlug,
      label: alias?.name.label || config.defaultLabel || "",
      description: alias?.name.description || "",
    },
    validation: {
      alias: validateAlias,
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
        const quickLabel = config.defaultLabel || "Quick Alias";
        const updatedRule = await updateRule(ruleToUse.id, quickLabel, "Created using random unused alias");

        await Clipboard.copy(updatedRule.email);
        showToast({
          style: Toast.Style.Success,
          title: "Alias Created",
          message: `Copied ${updatedRule.email} to clipboard`,
          primaryAction: {
            title: "Copy Email",
            onAction: () => {
              Clipboard.copy(updatedRule.email);
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
      {!alias && (
        <Form.TextField title="Alias" placeholder="random-slug or name@example.com" autoFocus {...itemProps.alias} />
      )}
      <Form.TextField
        title="Label"
        placeholder="Enter a label for this alias (required)"
        autoFocus={Boolean(alias)}
        {...itemProps.label}
      />
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
