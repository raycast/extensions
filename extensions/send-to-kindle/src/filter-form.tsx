import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { addFilter, coerceDomainInput, updateFilter } from "./filters";
import { ExportSkillForm, ImportSkillForm } from "./skill-transfer";

type FilterFormProps = {
  mode: "add" | "edit";
  filterId?: string;
  initialDomain?: string;
  initialSelector?: string;
  initialCoverSelector?: string;
  domainValue?: string;
  onDomainChange?: (value: string) => void;
  submitTitle: string;
  navigationTitle: string;
  isLoading?: boolean;
  shouldPop?: boolean;
  onSaved?: () => void;
};

export default function FilterForm({
  mode,
  filterId,
  initialDomain = "",
  initialSelector = "",
  initialCoverSelector = "",
  domainValue,
  onDomainChange,
  submitTitle,
  navigationTitle,
  isLoading = false,
  shouldPop = true,
  onSaved,
}: FilterFormProps) {
  const { pop } = useNavigation();
  const [domain, setDomain] = useState(domainValue ?? initialDomain);
  const [selector, setSelector] = useState(initialSelector);
  const [coverSelector, setCoverSelector] = useState(initialCoverSelector);

  useEffect(() => {
    if (domainValue !== undefined) {
      setDomain(domainValue);
    }
  }, [domainValue]);

  async function handleSubmit() {
    const normalizedDomain = coerceDomainInput(domain);
    const normalizedSelector = selector.trim();
    const normalizedCoverSelector = coverSelector.trim();

    if (!normalizedDomain) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing domain",
        message: "Enter a valid domain.",
      });
      return;
    }

    if (!normalizedSelector && !normalizedCoverSelector) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing filter",
        message: "Enter at least one selector in CSS Filter or Cover CSS.",
      });
      return;
    }

    if (mode === "edit") {
      if (!filterId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to edit",
          message: "Missing filter ID.",
        });
        return;
      }

      const updated = await updateFilter(filterId, normalizedDomain, normalizedSelector, normalizedCoverSelector);
      if (!updated) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Filter not found",
          message: "The filter may have been deleted.",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Filter updated",
      });
    } else {
      const result = await addFilter(normalizedDomain, normalizedSelector, normalizedCoverSelector);
      await showToast({
        style: Toast.Style.Success,
        title: result.operation === "updated" ? "Skill updated" : "Skill saved",
      });
    }

    onSaved?.();

    if (shouldPop) {
      pop();
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {mode === "add" ? (
            <Action.Push
              title="Import Skill JSON"
              icon={Icon.Download}
              shortcut={{ modifiers: ["opt"], key: "i" }}
              target={
                <ImportSkillForm
                  onImported={(filter) => {
                    setDomain(filter.domain);
                    setSelector(filter.selector);
                    setCoverSelector(filter.coverSelector);
                    onDomainChange?.(filter.domain);
                  }}
                />
              }
            />
          ) : (
            <Action.Push
              title="Export Skill JSON"
              icon={Icon.Upload}
              target={
                <ExportSkillForm
                  filter={{
                    domain,
                    selector,
                    coverSelector,
                  }}
                />
              }
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        info="Website where this skill applies. Use a root domain like example.com (no https:// or path)."
        value={domain}
        onChange={(value) => {
          setDomain(value);
          onDomainChange?.(value);
        }}
      />
      <Form.TextArea
        id="selector"
        title="CSS Filter"
        placeholder=".sidebar, .ads"
        info="CSS selectors to remove from article content before sending (ads, sidebars, popups). Separate selectors with commas."
        value={selector}
        onChange={setSelector}
      />
      <Form.TextArea
        id="coverSelector"
        title="Cover CSS"
        placeholder=".hero img, .article-cover img"
        info="CSS selectors for the cover image. The first matching image is used as the Kindle cover."
        value={coverSelector}
        onChange={setCoverSelector}
      />
    </Form>
  );
}
