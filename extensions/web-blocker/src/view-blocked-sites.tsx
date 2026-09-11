/**
 * View Blocked Sites Command
 * Provides a list interface for viewing and managing blocked domains
 */

import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  Color,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import {
  BlockedDomain,
  getBlockedDomains,
  removeBlockedDomain,
  toggleDomainEnabled,
  bulkDeleteDomains,
  bulkToggleDomains,
  bulkAssignCategories,
  getCategories,
  exportData,
  importData,
} from "./storage";
import { formatDomainForDisplay } from "./domainUtils";
import { syncBlockingStatus } from "./statusVerifier";
import AddWebsite from "./add-website";
import { Clipboard } from "@raycast/api";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export default function ViewBlockedSites() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    new Set(),
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ name: string }>>([]);

  // Load domains and blocking status
  useEffect(() => {
    async function loadData() {
      try {
        // First, sync the blocking status with actual hosts file
        const actualStatus = await syncBlockingStatus();

        // Then get the domains and categories
        const [blockedDomains, cats] = await Promise.all([
          getBlockedDomains(),
          getCategories(),
        ]);

        setDomains(blockedDomains);
        setCategories(cats);

        console.log(
          `✅ Loaded ${blockedDomains.length} domains. Blocking is ${actualStatus ? "ACTIVE" : "INACTIVE"} (verified from hosts file)`,
        );
      } catch (error) {
        console.error("Error loading blocked sites:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load",
          message: "Could not load blocked sites list",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle domain toggle
  async function handleToggleDomain(domain: string) {
    try {
      const newStatus = await toggleDomainEnabled(domain);

      // Update local state
      setDomains((prevDomains) =>
        prevDomains.map((d) =>
          d.domain === domain ? { ...d, isEnabled: newStatus } : d,
        ),
      );

      await showToast({
        style: Toast.Style.Success,
        title: newStatus ? "Domain Enabled" : "Domain Disabled",
        message: `${domain} is now ${newStatus ? "enabled" : "disabled"} for blocking`,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to Toggle" });
    }
  }

  // Handle domain deletion
  async function handleDeleteDomain(domain: string) {
    const confirmed = await confirmAlert({
      title: "Remove Website",
      message: `Are you sure you want to remove "${domain}" from your block list?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      const success = await removeBlockedDomain(domain);

      if (success) {
        // Update local state
        setDomains((prevDomains) =>
          prevDomains.filter((d) => d.domain !== domain),
        );

        await showToast({
          style: Toast.Style.Success,
          title: "Website Removed",
          message: `${domain} has been removed from your block list`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not Found",
          message: `${domain} was not found in your block list`,
        });
      }
    } catch (err) {
      await showFailureToast(err, { title: "Failed to Remove" });
    }
  }

  // Bulk action: Delete selected domains
  async function handleBulkDelete() {
    if (selectedDomains.size === 0) return;

    const confirmed = await confirmAlert({
      title: `Remove ${selectedDomains.size} Website${selectedDomains.size > 1 ? "s" : ""}`,
      message: `Are you sure you want to remove ${selectedDomains.size} website${selectedDomains.size > 1 ? "s" : ""} from your block list?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const count = await bulkDeleteDomains(Array.from(selectedDomains));
      setDomains((prev) => prev.filter((d) => !selectedDomains.has(d.domain)));
      setSelectedDomains(new Set());

      await showToast({
        style: Toast.Style.Success,
        title: "Websites Removed",
        message: `${count} website${count > 1 ? "s" : ""} removed`,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Failed" });
    }
  }

  // Bulk action: Enable/disable selected domains
  async function handleBulkToggle(enable: boolean) {
    if (selectedDomains.size === 0) return;

    try {
      const count = await bulkToggleDomains(
        Array.from(selectedDomains),
        enable,
      );
      setDomains((prev) =>
        prev.map((d) =>
          selectedDomains.has(d.domain) ? { ...d, isEnabled: enable } : d,
        ),
      );
      setSelectedDomains(new Set());

      await showToast({
        style: Toast.Style.Success,
        title: `Domains ${enable ? "Enabled" : "Disabled"}`,
        message: `${count} domain${count > 1 ? "s" : ""} updated`,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Failed" });
    }
  }

  // Bulk action: Assign categories
  async function handleBulkAssignCategory(categoryName: string) {
    if (selectedDomains.size === 0) return;

    try {
      const count = await bulkAssignCategories(Array.from(selectedDomains), [
        categoryName,
      ]);

      // Reload domains to reflect changes
      const updatedDomains = await getBlockedDomains();
      setDomains(updatedDomains);
      setSelectedDomains(new Set());

      await showToast({
        style: Toast.Style.Success,
        title: "Category Assigned",
        message: `${count} domain${count > 1 ? "s" : ""} updated`,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Failed" });
    }
  }

  // Toggle domain selection
  function toggleSelection(domain: string) {
    setSelectedDomains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  }

  // Get filtered domains
  function getFilteredDomains(): BlockedDomain[] {
    if (categoryFilter === "all") return domains;
    if (categoryFilter === "uncategorized") {
      return domains.filter((d) => !d.categories || d.categories.length === 0);
    }
    return domains.filter((d) => d.categories?.includes(categoryFilter));
  }

  // Export block list
  async function handleExport() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Exporting...",
      });

      const jsonData = await exportData();
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const filename = `webblocker-export-${timestamp}.json`;

      // Get proper Downloads folder path
      const homedir = process.env.HOME || process.env.USERPROFILE || "~";
      const downloadsPath = join(homedir, "Downloads");
      const filepath = join(downloadsPath, filename);

      await writeFile(filepath, jsonData, "utf-8");
      await Clipboard.copy(jsonData);

      await showToast({
        style: Toast.Style.Success,
        title: "Exported Successfully",
        message: `Saved to Downloads/${filename} and copied to clipboard`,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Export Failed" });
    }
  }

  // Import block list from clipboard
  async function handleImport() {
    try {
      const clipboardText = await Clipboard.readText();

      if (!clipboardText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Data",
          message: "Clipboard is empty. Copy JSON data first.",
        });
        return;
      }

      // Validate JSON format first
      try {
        JSON.parse(clipboardText);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid JSON",
          message:
            "Clipboard does not contain valid JSON data. Please export first and copy the data.",
        });
        return;
      }

      const confirmed = await confirmAlert({
        title: "Import Block List",
        message:
          "This will merge the imported data with your existing block list. Continue?",
        primaryAction: {
          title: "Import",
          style: Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Importing...",
      });

      await importData(clipboardText, true); // Always merge

      // Reload data
      const [updatedDomains, updatedCategories] = await Promise.all([
        getBlockedDomains(),
        getCategories(),
      ]);

      setDomains(updatedDomains);
      setCategories(updatedCategories);

      await showToast({
        style: Toast.Style.Success,
        title: "Imported Successfully",
        message: "Block list has been updated",
      });
    } catch (err) {
      await showFailureToast(err, { title: "Import Failed" });
    }
  }

  // Import block list from file
  async function handleImportFromFile() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening File Picker...",
      });

      // Open Finder to let user select a file
      const homedir = process.env.HOME || process.env.USERPROFILE || "~";
      const downloadsPath = join(homedir, "Downloads");

      // Use AppleScript to show file picker
      const { execSync } = await import("child_process");
      const script = `osascript -e 'POSIX path of (choose file with prompt "Select WebBlocker export JSON file" of type {"public.json"} default location "${downloadsPath}")'`;

      let filePath: string;
      try {
        filePath = execSync(script, { encoding: "utf-8" }).trim();
      } catch {
        // User cancelled
        return;
      }

      if (!filePath) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Reading file...",
      });

      const fileContent = await readFile(filePath, "utf-8");

      // Validate JSON format
      try {
        JSON.parse(fileContent);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid JSON",
          message: "The selected file does not contain valid JSON data.",
        });
        return;
      }

      const confirmed = await confirmAlert({
        title: "Import Block List",
        message:
          "This will merge the imported data with your existing block list. Continue?",
        primaryAction: {
          title: "Import",
          style: Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Importing...",
      });

      await importData(fileContent, true); // Always merge

      // Reload data
      const [updatedDomains, updatedCategories] = await Promise.all([
        getBlockedDomains(),
        getCategories(),
      ]);

      setDomains(updatedDomains);
      setCategories(updatedCategories);

      await showToast({
        style: Toast.Style.Success,
        title: "Imported Successfully",
        message: "Block list has been updated",
      });
    } catch (err) {
      await showFailureToast(err, { title: "Import Failed" });
    }
  }

  // Format date for display
  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  }

  // Empty state
  if (!isLoading && domains.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Blocked Websites"
          description="You haven't added any websites to your block list yet."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Website"
                target={<AddWebsite />}
                icon={Icon.Plus}
              />
              <Action
                title="Import from File"
                icon={Icon.Finder}
                onAction={handleImportFromFile}
              />
              <Action
                title="Import from Clipboard"
                icon={Icon.Upload}
                onAction={handleImport}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const filteredDomains = getFilteredDomains();

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Item title="Uncategorized" value="uncategorized" />
          <List.Dropdown.Section title="Categories">
            {categories.map((cat) => (
              <List.Dropdown.Item
                key={cat.name}
                title={cat.name}
                value={cat.name}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* Bulk actions section */}
      {selectedDomains.size > 0 && (
        <List.Section title={`${selectedDomains.size} Selected`}>
          <List.Item
            title="Bulk Actions"
            icon={Icon.CheckCircle}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Bulk Actions">
                  <Action
                    title="Enable Selected"
                    icon={Icon.CheckCircle}
                    onAction={() => handleBulkToggle(true)}
                  />
                  <Action
                    title="Disable Selected"
                    icon={Icon.XMarkCircle}
                    onAction={() => handleBulkToggle(false)}
                  />
                  <ActionPanel.Submenu title="Assign Category" icon={Icon.Tag}>
                    {categories.map((cat) => (
                      <Action
                        key={cat.name}
                        title={cat.name}
                        onAction={() => handleBulkAssignCategory(cat.name)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Delete Selected"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleBulkDelete}
                  />
                  <Action
                    title="Clear Selection"
                    icon={Icon.XMarkCircle}
                    onAction={() => setSelectedDomains(new Set())}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Blocked domains list */}
      <List.Section
        title={`Blocked Websites (${filteredDomains.length}${categoryFilter !== "all" ? ` filtered` : ""})`}
      >
        {filteredDomains.map((blockedDomain) => (
          <List.Item
            key={blockedDomain.domain}
            icon={{
              source: selectedDomains.has(blockedDomain.domain)
                ? Icon.CheckCircle
                : blockedDomain.isEnabled
                  ? Icon.Circle
                  : Icon.CircleProgress,
              tintColor: selectedDomains.has(blockedDomain.domain)
                ? Color.Blue
                : blockedDomain.isEnabled
                  ? Color.Green
                  : Color.SecondaryText,
            }}
            title={formatDomainForDisplay(blockedDomain.domain)}
            subtitle={blockedDomain.notes || undefined}
            accessories={[
              ...(blockedDomain.categories &&
              blockedDomain.categories.length > 0
                ? [
                    {
                      tag: {
                        value: blockedDomain.categories[0],
                        color: Color.Blue,
                      },
                      tooltip: blockedDomain.categories.join(", "),
                    },
                  ]
                : []),
              {
                text: formatDate(blockedDomain.dateAdded),
                icon: Icon.Calendar,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action
                    title={
                      selectedDomains.has(blockedDomain.domain)
                        ? "Deselect"
                        : "Select"
                    }
                    icon={
                      selectedDomains.has(blockedDomain.domain)
                        ? Icon.XMarkCircle
                        : Icon.CheckCircle
                    }
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => toggleSelection(blockedDomain.domain)}
                  />
                  <Action
                    title={
                      blockedDomain.isEnabled
                        ? "Disable Domain"
                        : "Enable Domain"
                    }
                    icon={
                      blockedDomain.isEnabled
                        ? Icon.XMarkCircle
                        : Icon.CheckCircle
                    }
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => handleToggleDomain(blockedDomain.domain)}
                  />
                  <Action
                    title="Remove Website"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDeleteDomain(blockedDomain.domain)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Domain"
                    content={blockedDomain.domain}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Manage">
                  <Action.Push
                    title="Add Website"
                    target={<AddWebsite />}
                    icon={Icon.Plus}
                  />
                  <Action
                    title="Export Block List"
                    icon={Icon.Download}
                    onAction={handleExport}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                  <Action
                    title="Import from File"
                    icon={Icon.Finder}
                    onAction={handleImportFromFile}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                  <Action
                    title="Import from Clipboard"
                    icon={Icon.Upload}
                    onAction={handleImport}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
