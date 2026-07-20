/**
 * Add Website Command
 * Provides a form interface for adding websites to the block list
 */

import React, { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { processDomainInput, isDuplicateDomain } from "./domainUtils";
import {
  addBlockedDomain,
  getBlockedDomainList,
  getCategories,
} from "./storage";
import { showLongHUD } from "./hudHelper";

interface FormValues {
  domain: string;
  categories: string[];
}

export default function AddWebsite() {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ name: string; icon?: string }>
  >([]);
  const { pop } = useNavigation();

  // Load categories on mount
  React.useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      // Process and validate domain input
      const { domain, isValid, error } = processDomainInput(values.domain);

      if (!isValid) {
        await showLongHUD(`❌ ${error}`);
        setIsLoading(false);
        return;
      }

      // Check for duplicates
      const existingDomains = await getBlockedDomainList();
      if (isDuplicateDomain(domain, existingDomains)) {
        await showLongHUD(`❌ ${domain} is already in your block list`);
        setIsLoading(false);
        return;
      }

      // Add domain to storage
      await addBlockedDomain(domain, undefined, true, values.categories);

      // Show success feedback
      await showToast({
        style: Toast.Style.Success,
        title: "Website Added",
        message: `${domain} added to your block list`,
      });

      // Close the form
      pop();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to Add Website" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Website"
            onSubmit={handleSubmit}
            icon="➕"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Website URL"
        placeholder="youtube.com, facebook.com, twitter.com"
        storeValue={false}
      />

      <Form.TagPicker
        id="categories"
        title="Categories"
        placeholder="Select categories (optional)"
        storeValue={false}
      >
        {categories.map((cat) => (
          <Form.TagPicker.Item
            key={cat.name}
            value={cat.name}
            title={cat.name}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
