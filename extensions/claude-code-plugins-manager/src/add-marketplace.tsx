/**
 * Add Marketplace form
 */

import React, { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { addMarketplace } from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";

interface AddMarketplaceProps {
  onAdded: () => void;
}

export default function AddMarketplace({ onAdded }: AddMarketplaceProps) {
  const [sourceType, setSourceType] = useState<string>("github");
  const [source, setSource] = useState<string>("");

  async function handleSubmit() {
    if (!source.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Source is required",
      });
      return;
    }

    // Validate GitHub format
    if (sourceType === "github" && !source.includes("/")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid GitHub repository",
        message: "Format must be: owner/repo",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding marketplace...",
    });

    try {
      const result = await addMarketplace(source);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Marketplace added successfully";
        invalidateCache(CACHE_KEYS.MARKETPLACES);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        onAdded();
        await popToRoot();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to add marketplace";
        toast.message = result.error;
      }
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add marketplace";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Marketplace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="sourceType"
        title="Source Type"
        value={sourceType}
        onChange={setSourceType}
      >
        <Form.Dropdown.Item value="github" title="GitHub Repository" />
        <Form.Dropdown.Item value="directory" title="Local Directory" />
        <Form.Dropdown.Item value="git" title="Git URL" />
        <Form.Dropdown.Item value="url" title="Remote URL" />
      </Form.Dropdown>

      {sourceType === "github" && (
        <Form.TextField
          id="source"
          title="GitHub Repository"
          placeholder="owner/repo (e.g., anthropics/claude-code)"
          value={source}
          onChange={setSource}
        />
      )}

      {sourceType === "directory" && (
        <Form.TextField
          id="source"
          title="Directory Path"
          placeholder="/path/to/marketplace"
          value={source}
          onChange={setSource}
        />
      )}

      {sourceType === "git" && (
        <Form.TextField
          id="source"
          title="Git URL"
          placeholder="https://github.com/owner/repo.git"
          value={source}
          onChange={setSource}
        />
      )}

      {sourceType === "url" && (
        <Form.TextField
          id="source"
          title="Remote URL"
          placeholder="https://example.com/marketplace.json"
          value={source}
          onChange={setSource}
        />
      )}

      <Form.Description text="Add a new plugin marketplace source to browse and install plugins from." />
    </Form>
  );
}
