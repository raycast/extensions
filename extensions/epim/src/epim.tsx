import {
  showToast,
  Toast,
  getPreferenceValues,
  List,
  ActionPanel,
  Action,
  Form,
  useNavigation,
  Icon,
  Color,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import React from "react";

const execFileAsync = promisify(execFile);

interface Preferences {
  powershellPath: string;
}

interface Role {
  displayName: string;
  description: string;
  roleTemplateId: string;
  directoryScopeId: string;
  isActive?: boolean;
  endDateTime?: string;
  remainingTime?: string;
}

interface ActiveRole {
  roleDefinitionId: string;
  endDateTime: string;
  startDateTime: string;
}

// PowerShell execution wrapper
async function executePowerShell(script: string): Promise<string> {
  const { powershellPath } = getPreferenceValues<Preferences>();

  // Add flags to ensure clean output
  const fullScript = `
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'

    ${script}
  `;

  try {
    // Add -NoProfile to prevent profile scripts from adding control sequences
    const { stdout, stderr } = await execFileAsync(powershellPath, ["-NoProfile", "-Command", fullScript]);

    if (stderr) {
      console.error("PowerShell stderr:", stderr);
      throw new Error(stderr);
    }

    return stdout.trim();
  } catch (error) {
    console.error("PowerShell execution error:", error);
    if (error instanceof Error) {
      throw new Error(`PowerShell execution failed: ${error.message}`);
    }
    throw error;
  }
}

async function getUserId(): Promise<string> {
  const script = `
    Import-Module Microsoft.Graph.Authentication -Force
    Import-Module Microsoft.Graph.Identity.Governance -Force
    Disconnect-MgGraph -ErrorAction SilentlyContinue
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

      Connect-MgGraph -Scopes 'RoleEligibilitySchedule.ReadWrite.Directory', 'RoleManagement.Read.Directory' -ErrorAction Stop | Out-Null

      $user = Invoke-MgGraphRequest -Uri 'https://graph.microsoft.com/v1.0/me' -Method GET
      $user.id
    } catch {
      throw "Failed to get user ID: $($_.Exception.Message)"
    }
  `;

  const userId = await executePowerShell(script);
  if (!userId) {
    throw new Error("Failed to get user ID");
  }
  return userId;
}

async function getEligibleRoles(userId: string): Promise<Role[]> {
  const script = `
    Import-Module Microsoft.Graph.Authentication -Force
    Import-Module Microsoft.Graph.Identity.Governance -Force
    Disconnect-MgGraph -ErrorAction SilentlyContinue
    try {
      Connect-MgGraph -Scopes 'RoleEligibilitySchedule.ReadWrite.Directory', 'RoleManagement.Read.Directory' -ErrorAction Stop | Out-Null

      $rolesSchedules = Get-MgRoleManagementDirectoryRoleEligibilityScheduleInstance -All
      $userSchedules = $rolesSchedules | Where-Object { $_.PrincipalId -eq '${userId}' }

      $roles = @()
      foreach ($schedule in $userSchedules) {
        $role = Get-MgDirectoryRole -Filter "RoleTemplateId eq '$($schedule.RoleDefinitionId)'"
        if ($role) {
          $roles += @{
            displayName = $role.DisplayName
            description = $role.Description
            roleTemplateId = $role.RoleTemplateId
            directoryScopeId = $schedule.DirectoryScopeId
          }
        }
      }

      # Convert to JSON with lowercase property names
      ConvertTo-Json -InputObject $roles -Compress
    } catch {
      throw "Failed to get eligible roles: $($_.Exception.Message)"
    }
  `;

  try {
    const rolesOutput = await executePowerShell(script);

    if (!rolesOutput || rolesOutput.trim() === "[]") {
      return [];
    }

    // Parse the JSON output into Role objects
    try {
      const roles = JSON.parse(rolesOutput) as Role[];
      return Array.isArray(roles) ? roles : [];
    } catch (jsonError) {
      console.error("JSON Parse Error:", jsonError);
      console.error("Invalid JSON:", rolesOutput);
      throw new Error("Failed to parse roles response: Invalid JSON");
    }
  } catch (error) {
    throw new Error("Failed to get eligible roles: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

// New function to get activated roles
async function getActivatedRoles(userId: string): Promise<ActiveRole[]> {
  const script = `
    Import-Module Microsoft.Graph.Authentication -Force
    Import-Module Microsoft.Graph.Identity.Governance -Force
    Disconnect-MgGraph -ErrorAction SilentlyContinue
    try {
      Connect-MgGraph -Scopes 'RoleEligibilitySchedule.ReadWrite.Directory', 'RoleManagement.Read.Directory' -ErrorAction Stop | Out-Null

      $activatedRoles = Get-MgRoleManagementDirectoryRoleAssignmentScheduleInstance -Filter "principalId eq '${userId}' and assignmentType eq 'Activated'"

      $result = $activatedRoles | ForEach-Object {
        @{
          roleDefinitionId = $_.RoleDefinitionId
          endDateTime = $_.EndDateTime
          startDateTime = $_.StartDateTime
        }
      }

      # Convert to JSON
      ConvertTo-Json -InputObject $result -Compress
    } catch {
      throw "Failed to get activated roles: $($_.Exception.Message)"
    }
  `;

  try {
    const output = await executePowerShell(script);

    if (!output || output.trim() === "[]" || output.trim() === "null") {
      return [];
    }

    try {
      const activatedRoles = JSON.parse(output) as ActiveRole[];
      return Array.isArray(activatedRoles) ? activatedRoles : [activatedRoles];
    } catch (jsonError) {
      console.error("JSON Parse Error:", jsonError);
      console.error("Invalid JSON:", output);
      return [];
    }
  } catch (error) {
    console.error("Failed to get activated roles:", error);
    return [];
  }
}

// Function to calculate remaining time
function calculateRemainingTime(endDateTime: string): string {
  const end = new Date(endDateTime);
  const now = new Date();

  // If the end time is in the past, return "Expired"
  if (end <= now) {
    return "Expired";
  }

  // Calculate difference in milliseconds
  const diffMs = end.getTime() - now.getTime();

  // Convert to hours and minutes
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}

// Function to format date time for display
function formatDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);

  // Get day, month, year, hours, and minutes with proper padding
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  // Return in DD.MM.YYYY HH:MM format
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Add new interfaces for our forms
interface JustificationFormProps {
  role: Role;
  userId: string;
}

interface JustificationFormValues {
  justification: string;
  duration: string;
}

async function activateRole(
  userId: string,
  role: Role,
  justification: string,
  duration: number,
): Promise<{ success: boolean; alreadyPending: boolean; alreadyExists: boolean; message?: string }> {
  const script = `
    Import-Module Microsoft.Graph.Authentication -Force
    Import-Module Microsoft.Graph.Identity.Governance -Force
    Disconnect-MgGraph -ErrorAction SilentlyContinue
    try {
      Connect-MgGraph -Scopes 'RoleEligibilitySchedule.ReadWrite.Directory', 'RoleManagement.Read.Directory' -ErrorAction Stop | Out-Null

      $params = @{
        Action = 'selfActivate'
        PrincipalId = '${userId}'
        RoleDefinitionId = '${role.roleTemplateId}'
        DirectoryScopeId = '${role.directoryScopeId}'
        Justification = '${justification.replace(/'/g, "''")}'
        ScheduleInfo = @{
          StartDateTime = Get-Date
          Expiration = @{
            Type = 'AfterDuration'
            Duration = 'PT${duration}H'
          }
        }
      }

      try {
        New-MgRoleManagementDirectoryRoleAssignmentScheduleRequest -BodyParameter $params | Out-Null
        Write-Output "SUCCESS"
      }
      catch {
        # Check for the specific "already exists" error
        if ($_.Exception.Message -like "*The Role assignment already exists*" -or $_.Exception.Message -like "*RoleAssignmentExists*") {
          Write-Output "ALREADY_EXISTS"
        }
        elseif ($_.Exception.Message -like "*There is already an existing pending Role assignment request*" -or $_.Exception.Message -like "*PendingRoleAssignmentRequest*") {
          Write-Output "ALREADY_PENDING"
        }
        else {
          # Re-throw other errors
          throw $_
        }
      }
    } catch {
      throw "Failed to activate role: $($_.Exception.Message)"
    }
  `;

  try {
    const result = await executePowerShell(script);

    if (result.includes("ALREADY_EXISTS")) {
      return {
        success: true,
        alreadyExists: true,
        alreadyPending: false,
        message: `Role '${role.displayName}' is already active`,
      };
    } else if (result.includes("ALREADY_PENDING")) {
      return {
        success: true,
        alreadyExists: false,
        alreadyPending: true,
        message: `Role '${role.displayName}' was pending. Might be active now!`,
      };
    }

    return { success: true, alreadyExists: false, alreadyPending: false };
  } catch (error) {
    return {
      success: false,
      alreadyExists: false,
      alreadyPending: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Add the form component
function JustificationForm({ role, userId }: JustificationFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: JustificationFormValues) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Activating role..." });

      const activationResult = await activateRole(userId, role, values.justification, parseInt(values.duration));

      if (activationResult.alreadyExists) {
        await showToast({
          style: Toast.Style.Success,
          title: "Role Already Active",
          message: activationResult.message,
        });
        pop();
        return;
      } else if (activationResult.alreadyPending) {
        await showToast({
          style: Toast.Style.Success,
          title: "Role Already Pending",
          message: activationResult.message,
        });
        pop();
        return;
      }

      if (!activationResult.success) {
        throw new Error(activationResult.message || "Failed to activate role");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Role activated successfully",
        message: `${role.displayName} activated for ${values.duration} hour${values.duration === "1" ? "" : "s"}`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to activate role",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Activate Role" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="justification" title="Justification" placeholder="Why do you need this role?" />
      <Form.Dropdown id="duration" title="Duration" defaultValue="1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => (
          <Form.Dropdown.Item key={hours} value={hours.toString()} title={`${hours} hour${hours > 1 ? "s" : ""}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

// Add a new component for the main list view
function CommandList({ userId, roles }: { userId: string; roles: Role[] }) {
  return (
    <List isShowingDetail searchBarPlaceholder="Choose PIM Role to activate...">
      {roles.map((role, index) => (
        <List.Item
          key={role.roleTemplateId || index}
          title={role.displayName}
          accessories={[
            {
              icon: role.isActive ? { source: Icon.CircleFilled, tintColor: Color.Green } : undefined,
              tooltip: role.isActive ? `Expires in ${role.remainingTime!}` : "Inactive",
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={`## ${role.displayName}\n${role.description || "No description available."}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={
                      role.isActive ? { value: "Active", color: Color.Green } : { value: "Inactive", color: Color.Red }
                    }
                  />
                  {role.isActive && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Remaining Time"
                        text={{ value: role.remainingTime!, color: Color.Green }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="End Time"
                        text={{ value: formatDateTime(role.endDateTime!), color: Color.Green }}
                      />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Role Template ID" text={role.roleTemplateId} />
                  <List.Item.Detail.Metadata.Label title="Directory Scope ID" text={role.directoryScopeId} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title={role.isActive ? "Role Already Active" : "Activate Role"}
                target={<JustificationForm role={role} userId={userId} />}
              />
              {role.isActive && (
                <Action
                  title="Show Active Until"
                  onAction={() =>
                    showToast({
                      style: Toast.Style.Success,
                      title: "Active until:",
                      message: formatDateTime(role.endDateTime!),
                    })
                  }
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Update the main command to handle the async loading state
export default function Command() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<{ userId: string; roles: Role[] } | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Connecting to Microsoft Graph...",
        });

        const userId = await getUserId();

        await showToast({
          style: Toast.Style.Animated,
          title: "Getting eligible roles...",
        });

        const eligibleRoles = await getEligibleRoles(userId);

        if (eligibleRoles.length === 0) {
          throw new Error("No eligible roles found");
        }

        // Get activated roles
        const activatedRoles = await getActivatedRoles(userId);

        // Merge data from eligible and activated roles
        const rolesWithActiveStatus = eligibleRoles.map((role) => {
          const activeRole = activatedRoles.find((ar) => ar.roleDefinitionId === role.roleTemplateId);
          if (activeRole) {
            return {
              ...role,
              isActive: true,
              endDateTime: activeRole.endDateTime,
              remainingTime: calculateRemainingTime(activeRole.endDateTime),
            };
          }
          return { ...role, isActive: false };
        });

        setData({ userId, roles: rolesWithActiveStatus });
      } catch (e) {
        setError(e instanceof Error ? e : new Error("An unknown error occurred"));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <List isLoading={true} />;
  }

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error.message,
    });
    return <List />;
  }

  if (!data) {
    return <List />;
  }

  return <CommandList userId={data.userId} roles={data.roles} />;
}
