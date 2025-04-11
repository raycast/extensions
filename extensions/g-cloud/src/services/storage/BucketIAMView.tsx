import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Detail,
  Color,
  useNavigation,
  Form,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { formatRoleName, getRoleInfo } from "../../utils/iamRoles";

const execPromise = promisify(exec);

interface BucketIAMViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName: string;
}

// Cache TTL constants (in milliseconds)
const CACHE_TTL = 900000; // 15 minutes
const CACHE_TTL_DETAILS = 1800000; // 30 minutes

interface IAMBinding {
  role: string;
  members: string[];
  condition?: {
    title: string;
    description?: string;
    expression: string;
  };
}

interface IAMPolicy {
  bindings: IAMBinding[];
  etag: string;
  version: number;
}

interface CommandOptions {
  projectId?: string;
  formatJson?: boolean;
  quiet?: boolean;
  retries?: number;
}

interface FormValues {
  role: string;
  memberType: string;
  member: string;
  addCondition: boolean;
  conditionTitle: string;
  conditionExpression: string;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

export default function BucketIAMView({ projectId, gcloudPath, bucketName }: BucketIAMViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [policy, setPolicy] = useState<IAMPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  // Cache stored in a ref to persist between renders
  const cache = useRef<Map<string, CacheEntry>>(new Map());

  // Function to clean expired cache entries
  function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of cache.current.entries()) {
      // Check if entry has expired based on its type
      const isDetailsEntry = key.startsWith("service-details:");
      const ttl = isDetailsEntry ? CACHE_TTL_DETAILS : CACHE_TTL;

      if (now - entry.timestamp > ttl) {
        cache.current.delete(key);
      }
    }
  }

  // Function to invalidate cache entries matching a pattern
  function invalidateCache(pattern: RegExp) {
    // Clean expired entries first
    cleanExpiredCache();

    // Then invalidate matching entries
    for (const key of Array.from(cache.current.keys())) {
      if (pattern.test(key)) {
        cache.current.delete(key);
      }
    }
  }

  // Optimized command execution with caching
  async function executeCommand(gcloudPath: string, command: string, options: CommandOptions = {}) {
    const { projectId, formatJson = true, quiet = false, retries = 0 } = options;

    // Clean expired cache entries before checking cache
    cleanExpiredCache();

    // Build the full command
    const projectFlag = projectId ? ` --project=${projectId}` : "";
    const formatFlag = formatJson ? " --format=json" : "";
    const quietFlag = quiet ? " --quiet" : "";

    const fullCommand = `${gcloudPath} ${command}${projectFlag}${formatFlag}${quietFlag}`;

    // Check cache first
    const cacheKey = fullCommand;
    const cachedEntry = cache.current.get(cacheKey);

    if (cachedEntry) {
      // Verify the entry hasn't expired
      const isDetailsEntry = cacheKey.startsWith("service-details:");
      const ttl = isDetailsEntry ? CACHE_TTL_DETAILS : CACHE_TTL;

      if (Date.now() - cachedEntry.timestamp <= ttl) {
        return cachedEntry.data;
      } else {
        // Entry has expired, remove it
        cache.current.delete(cacheKey);
      }
    }

    try {
      const { stdout, stderr } = await execPromise(fullCommand);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      if (!formatJson) {
        return stdout;
      }

      if (!stdout || stdout.trim() === "") {
        return [];
      }

      const result = JSON.parse(stdout);

      // Cache the result with timestamp
      cache.current.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      if (retries > 0) {
        return executeCommand(gcloudPath, command, {
          projectId,
          formatJson,
          quiet,
          retries: retries - 1,
        });
      }
      throw error;
    }
  }

  // Memoized fetch function to avoid recreating it on every render
  const fetchIAMPolicy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading IAM policy...",
      message: `Bucket: ${bucketName}`,
    });

    try {
      // Use the optimized command execution with caching
      const result = await executeCommand(gcloudPath, `storage buckets get-iam-policy gs://${bucketName}`, {
        projectId,
        retries: 1,
      });

      if (!result || !result.bindings) {
        setPolicy({
          bindings: [],
          etag: "",
          version: 1,
        });
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "No IAM bindings found",
          message: `Bucket "${bucketName}" has no IAM bindings configured`,
        });
        setIsLoading(false);
        return;
      }

      setPolicy(result as IAMPolicy);

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "IAM policy loaded",
        message: `Found ${result.bindings.length} role bindings`,
      });
    } catch (error) {
      loadingToast.hide();
      console.error("Error fetching IAM policy:", error);

      // Provide more user-friendly error messages for common errors
      let errorMessage = String(error);
      let errorTitle = "Failed to load IAM policy";

      if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = `You don't have permission to view IAM policy for "${bucketName}".`;
      } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        errorTitle = "Bucket not found";
        errorMessage = `The bucket "${bucketName}" was not found. It may have been deleted.`;
      }

      setError(`${errorTitle}: ${errorMessage}`);

      showFailureToast({ title: errorTitle, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath, bucketName]);

  // Initial load
  useEffect(() => {
    fetchIAMPolicy();
  }, [fetchIAMPolicy]);

  // Add cache cleanup on component mount and unmount
  useEffect(() => {
    // Clean expired entries on mount
    cleanExpiredCache();

    // Set up periodic cache cleanup
    const cleanupInterval = setInterval(cleanExpiredCache, CACHE_TTL / 2);

    // Cleanup on unmount
    return () => {
      clearInterval(cleanupInterval);
      cache.current.clear();
    };
  }, []);

  async function addBinding() {
    push(
      <Form
        navigationTitle="Add IAM Binding"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Binding"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onSubmit={createBinding}
            />
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => pop()}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="role" title="Role" defaultValue="roles/storage.objectViewer" info="The IAM role to grant">
          <Form.Dropdown.Item value="roles/storage.objectViewer" title="Storage Object Viewer" icon={Icon.Eye} />
          <Form.Dropdown.Item value="roles/storage.objectCreator" title="Storage Object Creator" icon={Icon.Plus} />
          <Form.Dropdown.Item value="roles/storage.objectAdmin" title="Storage Object Admin" icon={Icon.Cog} />
          <Form.Dropdown.Item value="roles/storage.admin" title="Storage Admin" icon={Icon.Gear} />
          <Form.Dropdown.Item value="roles/storage.legacyBucketOwner" title="Legacy Bucket Owner" icon={Icon.Person} />
          <Form.Dropdown.Item value="roles/storage.legacyBucketReader" title="Legacy Bucket Reader" icon={Icon.Book} />
          <Form.Dropdown.Item
            value="roles/storage.legacyBucketWriter"
            title="Legacy Bucket Writer"
            icon={Icon.Pencil}
          />
          <Form.Dropdown.Item value="roles/storage.legacyObjectOwner" title="Legacy Object Owner" icon={Icon.Person} />
          <Form.Dropdown.Item value="roles/storage.legacyObjectReader" title="Legacy Object Reader" icon={Icon.Book} />
        </Form.Dropdown>
        <Form.Dropdown
          id="memberType"
          title="Member Type"
          defaultValue="user"
          info="The type of member to grant the role to"
        >
          <Form.Dropdown.Item value="user" title="User" icon={Icon.Person} />
          <Form.Dropdown.Item value="group" title="Group" icon={Icon.PersonCircle} />
          <Form.Dropdown.Item value="serviceAccount" title="Service Account" icon={Icon.Key} />
          <Form.Dropdown.Item value="domain" title="Domain" icon={Icon.Globe} />
          <Form.Dropdown.Item value="allUsers" title="All Users (Public)" icon={Icon.Globe} />
          <Form.Dropdown.Item value="allAuthenticatedUsers" title="All Authenticated Users" icon={Icon.PersonCircle} />
        </Form.Dropdown>
        <Form.TextField
          id="member"
          title="Member"
          placeholder="user@example.com"
          info="The email address of the member (not needed for allUsers or allAuthenticatedUsers)"
        />
        <Form.Checkbox
          id="addCondition"
          label="Add condition"
          defaultValue={false}
          info="Add a condition to the binding"
        />
        <Form.TextField
          id="conditionTitle"
          title="Condition Title"
          placeholder="Time-based access"
          info="A title for the condition"
        />
        <Form.TextArea
          id="conditionExpression"
          title="Condition Expression"
          placeholder="request.time < timestamp('2023-12-31T23:59:59Z')"
          info="The CEL expression for the condition"
        />
        <Form.Description
          title="Common Roles"
          text={`• Storage Object Viewer: View objects
• Storage Object Creator: Create objects
• Storage Object Admin: Full control over objects
• Storage Admin: Full control over buckets and objects
• Legacy Bucket Owner: Full control over a bucket
• Legacy Bucket Reader: Read bucket metadata
• Legacy Bucket Writer: Write objects to a bucket
• Legacy Object Owner: Full control over specific objects
• Legacy Object Reader: Read specific objects`}
        />
      </Form>,
    );
  }

  async function createBinding(formValues: FormValues) {
    const creatingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding IAM binding...",
      message: `Role: ${formValues.role}`,
    });

    try {
      if (!policy) {
        throw new Error("No policy loaded");
      }

      // Format the member string based on the type
      let memberString = "";
      if (formValues.memberType === "allUsers") {
        memberString = "allUsers";
      } else if (formValues.memberType === "allAuthenticatedUsers") {
        memberString = "allAuthenticatedUsers";
      } else {
        if (!formValues.member) {
          throw new Error("Member email is required");
        }

        // Validate the member ID format
        if (!validateMemberId(formValues.memberType, formValues.member)) {
          throw new Error(`Invalid format for ${formValues.memberType}. Please check and try again.`);
        }

        memberString = `${formValues.memberType}:${formValues.member}`;
      }

      // Create a copy of the current policy
      const updatedPolicy = { ...policy };

      // Find if the role already exists
      const existingBindingIndex = updatedPolicy.bindings.findIndex((b) => b.role === formValues.role);

      // Create condition object if needed
      let condition = undefined;
      if (formValues.addCondition && formValues.conditionTitle && formValues.conditionExpression) {
        condition = {
          title: formValues.conditionTitle,
          expression: formValues.conditionExpression,
        };
      }

      if (existingBindingIndex >= 0) {
        // Role exists, add the member if it doesn't already exist
        const binding = updatedPolicy.bindings[existingBindingIndex];

        // If we're adding a condition, we need to create a new binding
        if (condition) {
          updatedPolicy.bindings.push({
            role: formValues.role,
            members: [memberString],
            condition,
          });
        } else {
          // Otherwise, add to existing binding if member doesn't exist
          if (!binding.members.includes(memberString)) {
            binding.members.push(memberString);
          }
        }
      } else {
        // Role doesn't exist, create a new binding
        updatedPolicy.bindings.push({
          role: formValues.role,
          members: [memberString],
          condition,
        });
      }

      // Create a temporary JSON file with the updated policy
      let tempFilePath = "";
      try {
        // Generate unique temp file path
        tempFilePath = path.join(os.tmpdir(), `iam-policy-${bucketName}-${Date.now()}.json`);

        // Write policy to temp file
        fs.writeFileSync(tempFilePath, JSON.stringify(updatedPolicy, null, 2));

        // Update the bucket with the new IAM policy
        await executeCommand(gcloudPath, `storage buckets set-iam-policy gs://${bucketName} ${tempFilePath}`, {
          projectId,
          formatJson: false,
          quiet: true,
        });

        creatingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "IAM binding added successfully",
          message: `Role "${formValues.role}" granted to ${memberString}`,
        });

        // Invalidate the cache
        invalidateCache(new RegExp(`gs://${bucketName}`));

        // Refresh the policy and go back to the list view
        pop();
        fetchIAMPolicy();
      } catch (error) {
        creatingToast.hide();
        console.error("Error adding IAM binding:", error);

        // Provide more specific error messages
        let errorMessage = String(error);
        let errorTitle = "Failed to add IAM binding";

        if (errorMessage.includes("ENOSPC")) {
          errorTitle = "Disk space error";
          errorMessage = "Not enough disk space to create temporary policy file.";
        } else if (errorMessage.includes("EACCES")) {
          errorTitle = "Permission denied";
          errorMessage = "Cannot write temporary policy file. Check folder permissions.";
        } else if (errorMessage.includes("does not exist")) {
          errorTitle = "User not found";
          errorMessage = `The user ${formValues.member} does not exist. Please check the email address and try again.`;
        } else if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to modify IAM policies for this bucket.";
        }

        showFailureToast({ title: errorTitle, message: errorMessage });
      } finally {
        // Clean up the temporary file if it exists
        if (tempFilePath) {
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (cleanupError) {
            console.error("Error cleaning up temporary file:", cleanupError);
          }
        }
      }
    } catch (error) {
      creatingToast.hide();
      console.error("Error adding IAM binding:", error);

      // Provide more specific error messages
      let errorMessage = String(error);
      let errorTitle = "Failed to add IAM binding";

      if (errorMessage.includes("does not exist")) {
        errorTitle = "User not found";
        errorMessage = `The user ${formValues.member} does not exist. Please check the email address and try again.`;
      } else if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = "You don't have permission to modify IAM policies for this bucket.";
      }

      showFailureToast({ title: errorTitle, message: errorMessage });
    }
  }

  // Helper function to validate member ID format based on type
  function validateMemberId(type: string, id: string): boolean {
    switch (type) {
      case "user":
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "serviceAccount":
        // Service account email validation
        return (
          /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(id) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)
        );
      case "group":
        // Group email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "domain":
        // Domain validation
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(id);
      default:
        // For unknown types, just check it's not empty
        return id.trim() !== "";
    }
  }

  async function removeBinding(role: string, member: string) {
    const options = {
      title: "Remove IAM Binding",
      message: `Are you sure you want to remove "${member}" from role "${role}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Remove",
        style: Action.Style.Destructive,
      },
    };

    // @ts-expect-error The type definition for confirmAlert options doesn't match the actual API
    if (await confirmAlert(options)) {
      const removingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing IAM binding...",
        message: `Role: ${role}, Member: ${member}`,
      });

      try {
        if (!policy) {
          throw new Error("No policy loaded");
        }

        // Create a copy of the current policy
        const updatedPolicy = { ...policy };

        // Find the binding for this role
        const bindingIndex = updatedPolicy.bindings.findIndex((b) => b.role === role);

        if (bindingIndex >= 0) {
          const binding = updatedPolicy.bindings[bindingIndex];

          // Remove the member
          const memberIndex = binding.members.indexOf(member);
          if (memberIndex >= 0) {
            binding.members.splice(memberIndex, 1);

            // If no members left, remove the binding
            if (binding.members.length === 0) {
              updatedPolicy.bindings.splice(bindingIndex, 1);
            }

            // Create a temporary JSON file with the updated policy
            let tempFilePath = "";
            try {
              // Generate unique temp file path
              tempFilePath = path.join(os.tmpdir(), `iam-policy-${bucketName}-${Date.now()}.json`);

              // Write policy to temp file
              fs.writeFileSync(tempFilePath, JSON.stringify(updatedPolicy, null, 2));

              // Update the bucket with the new IAM policy
              await executeCommand(gcloudPath, `storage buckets set-iam-policy gs://${bucketName} ${tempFilePath}`, {
                projectId,
                formatJson: false,
                quiet: true,
              });

              removingToast.hide();
              showToast({
                style: Toast.Style.Success,
                title: "IAM binding removed successfully",
                message: `Role "${role}" removed from ${member}`,
              });

              // Invalidate the cache
              invalidateCache(new RegExp(`gs://${bucketName}`));

              // Refresh the policy
              fetchIAMPolicy();
            } catch (error) {
              removingToast.hide();
              console.error("Error removing IAM binding:", error);

              // Provide more user-friendly error messages for common errors
              let errorMessage = String(error);
              let errorTitle = "Failed to remove IAM binding";

              if (errorMessage.includes("ENOSPC")) {
                errorTitle = "Disk space error";
                errorMessage = "Not enough disk space to create temporary policy file.";
              } else if (errorMessage.includes("EACCES")) {
                errorTitle = "Permission denied";
                errorMessage = "Cannot write temporary policy file. Check folder permissions.";
              } else if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
                errorTitle = "Permission denied";
                errorMessage = "You don't have permission to modify this bucket's IAM policy.";
              }

              showFailureToast({ title: errorTitle, message: errorMessage });
            } finally {
              // Clean up the temporary file if it exists
              if (tempFilePath) {
                try {
                  if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                  }
                } catch (cleanupError) {
                  console.error("Error cleaning up temporary file:", cleanupError);
                }
              }
            }
          } else {
            throw new Error(`Member "${member}" not found in role "${role}"`);
          }
        } else {
          throw new Error(`Role "${role}" not found in policy`);
        }
      } catch (error) {
        removingToast.hide();
        console.error("Error removing IAM binding:", error);

        // Provide more user-friendly error messages for common errors
        let errorMessage = String(error);
        let errorTitle = "Failed to remove IAM binding";

        if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to modify this bucket's IAM policy.";
        }

        showFailureToast({ title: errorTitle, message: errorMessage });
      }
    }
  }

  function viewRoleDetails(role: string, binding: IAMBinding) {
    // Format the role name for display
    const formattedRole = formatRoleName(role);

    // Format the members list
    const membersText = binding.members
      .map((member) => {
        const [type, email] = member.includes(":") ? member.split(":", 2) : [member, ""];
        return `- **${formatMemberType(type)}**: ${email || type}`;
      })
      .join("\n\n");

    // Format condition if present
    const conditionText = binding.condition
      ? `## Condition\n\n**Title:** ${binding.condition.title}\n\n**Expression:** \`${binding.condition.expression}\`\n\n${binding.condition.description ? `**Description:** ${binding.condition.description}` : ""}`
      : "";

    const detailsMarkdown =
      `# Role: ${formattedRole}\n\n` +
      `## Members\n\n` +
      membersText +
      (conditionText ? `\n\n${conditionText}` : "") +
      `\n\n## Permissions\n\n` +
      getRolePermissionsDescription(role);

    push(
      <Detail
        navigationTitle={`Role: ${formattedRole}`}
        markdown={detailsMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Role" text={formattedRole} />
            <Detail.Metadata.Label title="Role ID" text={role} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Members" text={`${binding.members.length}`} />
            {binding.condition && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="Condition" text={binding.condition.title} />
                <Detail.Metadata.Label title="Expression" text={binding.condition.expression} />
              </>
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Add Member"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={addBinding}
            />
            <Action
              title="Back to Roles"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() => pop()}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={fetchIAMPolicy}
            />
          </ActionPanel>
        }
      />,
    );
  }

  // Helper function to format member types for display
  function formatMemberType(type: string): string {
    switch (type) {
      case "user":
        return "User";
      case "group":
        return "Group";
      case "serviceAccount":
        return "Service Account";
      case "domain":
        return "Domain";
      case "allUsers":
        return "All Users (Public)";
      case "allAuthenticatedUsers":
        return "All Authenticated Users";
      default:
        return type;
    }
  }

  // Helper function to get a description of the permissions granted by a role
  function getRolePermissionsDescription(role: string): string {
    return getRoleInfo(role).description;
  }

  // Helper function to get an icon for a role
  function getRoleIcon(role: string) {
    if (role.includes("admin") || role.includes("Admin")) {
      return { source: Icon.Gear, tintColor: Color.Red };
    } else if (
      role.includes("viewer") ||
      role.includes("Viewer") ||
      role.includes("reader") ||
      role.includes("Reader")
    ) {
      return { source: Icon.Eye, tintColor: Color.Blue };
    } else if (
      role.includes("creator") ||
      role.includes("Creator") ||
      role.includes("writer") ||
      role.includes("Writer")
    ) {
      return { source: Icon.Pencil, tintColor: Color.Green };
    } else if (role.includes("owner") || role.includes("Owner")) {
      return { source: Icon.Person, tintColor: Color.Purple };
    } else {
      return { source: Icon.Key, tintColor: Color.PrimaryText };
    }
  }

  // Helper function to get a subtitle for a role
  function getRoleSubtitle(role: string): string {
    return formatRoleName(role);
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          title={error}
          description="Click to try again"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchIAMPolicy} />
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search IAM bindings..."
      navigationTitle={`IAM Policy - ${bucketName}`}
      actions={
        <ActionPanel>
          <Action
            title="Add Binding"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={addBinding}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchIAMPolicy}
          />
          <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "b" }} onAction={pop} />
        </ActionPanel>
      }
    >
      {!policy || (policy.bindings.length === 0 && !isLoading) ? (
        <List.EmptyView
          title="No IAM bindings found"
          description={`Bucket "${bucketName}" has no IAM bindings configured. Add a binding to grant access.`}
          icon={{ source: Icon.Key, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Add Binding"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={addBinding}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={fetchIAMPolicy}
              />
              <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "b" }} onAction={pop} />
            </ActionPanel>
          }
        />
      ) : (
        policy &&
        policy.bindings.map((binding) => (
          <List.Section key={binding.role} title={binding.role} subtitle={getRoleSubtitle(binding.role)}>
            <List.Item
              title={formatRoleName(binding.role)}
              subtitle={`${binding.members.length} ${binding.members.length === 1 ? "member" : "members"}`}
              icon={getRoleIcon(binding.role)}
              // @ts-expect-error The accessories array filtering causes a type incompatibility
              accessories={[
                binding.condition ? { icon: Icon.Clock, tooltip: `Condition: ${binding.condition.title}` } : null,
                { text: `${binding.members.length} ${binding.members.length === 1 ? "member" : "members"}` },
              ].filter(Boolean)}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => viewRoleDetails(binding.role, binding)}
                  />
                  <Action
                    title="Add Member"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={addBinding}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchIAMPolicy}
                  />
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={pop}
                  />
                </ActionPanel>
              }
            />
            {binding.members.map((member) => (
              <List.Item
                key={`${binding.role}-${member}`}
                title={member}
                subtitle={member.includes(":") ? member.split(":", 1)[0] : "Special Identity"}
                icon={{ source: Icon.Person, tintColor: Color.Blue }}
                // @ts-expect-error The accessories array filtering causes a type incompatibility
                accessories={[
                  binding.condition ? { icon: Icon.Clock, tooltip: `Condition: ${binding.condition.title}` } : null,
                ].filter(Boolean)}
                actions={
                  <ActionPanel>
                    <Action
                      title="Remove Member"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={() => removeBinding(binding.role, member)}
                    />
                    <Action
                      title="Add Member"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={addBinding}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchIAMPolicy}
                    />
                    <Action
                      title="Back"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={pop}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
