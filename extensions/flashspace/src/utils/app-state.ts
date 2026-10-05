import { AppDescriptor } from "./apps";

export interface AssignedAppItem extends AppDescriptor {
  identifier: string;
  isAssigned: boolean;
  assignedWorkspaces: string[];
}

export interface FloatingAppItem extends AppDescriptor {
  identifier: string;
  isFloating: boolean;
}

export interface AssignedAppOverride {
  app: AppDescriptor;
  isAssigned: boolean;
}

export interface FloatingAppOverride {
  app: AppDescriptor;
  isFloating: boolean;
}

export function getAppIdentifier(app: AppDescriptor): string {
  return app.bundleId || app.name;
}

export function buildAssignedAppItems(
  runningApps: AppDescriptor[],
  assignedWorkspacesByApp: Record<string, string[]>,
  overrides: Record<string, AssignedAppOverride> = {},
  activeWorkspace?: string,
): AssignedAppItem[] {
  return [...runningApps]
    .map((app) => {
      const identifier = getAppIdentifier(app);
      const override = overrides[identifier];
      const assignedWorkspaces = assignedWorkspacesByApp[identifier] || [];
      const isAssigned = override?.isAssigned ?? assignedWorkspaces.length > 0;

      return {
        ...(override?.app || app),
        identifier,
        isAssigned,
        assignedWorkspaces: isAssigned
          ? assignedWorkspaces.length > 0
            ? assignedWorkspaces
            : activeWorkspace
              ? [activeWorkspace]
              : []
          : [],
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildFloatingAppItems(
  apps: AppDescriptor[],
  floatingApps: AppDescriptor[],
  overrides: Record<string, FloatingAppOverride> = {},
): FloatingAppItem[] {
  const items = new Map<string, FloatingAppItem>();

  for (const app of apps) {
    const identifier = getAppIdentifier(app);
    items.set(identifier, {
      ...app,
      identifier,
      isFloating: false,
    });
  }

  for (const app of floatingApps) {
    const identifier = getAppIdentifier(app);
    items.set(identifier, {
      ...items.get(identifier),
      ...app,
      identifier,
      isFloating: true,
    });
  }

  for (const [identifier, override] of Object.entries(overrides)) {
    items.set(identifier, {
      ...items.get(identifier),
      ...override.app,
      identifier,
      isFloating: override.isFloating,
    });
  }

  return [...items.values()].sort((left, right) => left.name.localeCompare(right.name));
}
