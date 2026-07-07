import { Action, ActionPanel, closeMainWindow, Color, Icon, List, PopToRootType, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  openOrgToPage,
  addToRecentSetupPages,
  getRecentSetupPages,
  getPinnedSetupPages,
  togglePinSetupPage,
  SalesforceOrg,
} from "./lib/sfdx";
import { OrgListDropdown, useDefaultOrgSelection } from "./org-dropdown";

export interface SetupPage {
  id: string;
  title: string;
  category: string;
  path: string;
  keywords: string[];
  icon: Icon;
}

const SETUP_PAGES: SetupPage[] = [
  // Administration
  {
    id: "users",
    title: "Users",
    category: "Administration",
    path: "/lightning/setup/ManageUsers/home",
    keywords: ["user", "people", "access"],
    icon: Icon.Person,
  },
  {
    id: "profiles",
    title: "Profiles",
    category: "Administration",
    path: "/lightning/setup/EnhancedProfiles/home",
    keywords: ["profile", "permissions", "access", "security"],
    icon: Icon.Shield,
  },
  {
    id: "permission-sets",
    title: "Permission Sets",
    category: "Administration",
    path: "/lightning/setup/PermSets/home",
    keywords: ["permission", "access", "security"],
    icon: Icon.Lock,
  },
  {
    id: "permission-set-groups",
    title: "Permission Set Groups",
    category: "Administration",
    path: "/lightning/setup/PermSetGroups/home",
    keywords: ["permission", "group", "access"],
    icon: Icon.TwoPeople,
  },
  {
    id: "roles",
    title: "Roles",
    category: "Administration",
    path: "/lightning/setup/Roles/home",
    keywords: ["role", "hierarchy"],
    icon: Icon.Network,
  },
  {
    id: "public-groups",
    title: "Public Groups",
    category: "Administration",
    path: "/lightning/setup/PublicGroups/home",
    keywords: ["group", "sharing"],
    icon: Icon.TwoPeople,
  },
  {
    id: "queues",
    title: "Queues",
    category: "Administration",
    path: "/lightning/setup/Queues/home",
    keywords: ["queue", "assignment"],
    icon: Icon.List,
  },

  // Objects & Fields
  {
    id: "object-manager",
    title: "Object Manager",
    category: "Objects and Fields",
    path: "/lightning/setup/ObjectManager/home",
    keywords: ["object", "custom", "field", "schema"],
    icon: Icon.Box,
  },
  {
    id: "picklist-value-sets",
    title: "Picklist Value Sets",
    category: "Objects and Fields",
    path: "/lightning/setup/Picklists/home",
    keywords: ["picklist", "values", "global"],
    icon: Icon.List,
  },

  // Automation
  {
    id: "flows",
    title: "Flows",
    category: "Automation",
    path: "/lightning/setup/Flows/home",
    keywords: ["flow", "automation", "process"],
    icon: Icon.Wand,
  },
  {
    id: "process-builder",
    title: "Process Builder",
    category: "Automation",
    path: "/lightning/setup/ProcessAutomation/home",
    keywords: ["process", "automation", "workflow"],
    icon: Icon.Gear,
  },
  {
    id: "workflow-rules",
    title: "Workflow Rules",
    category: "Automation",
    path: "/lightning/setup/WorkflowRules/home",
    keywords: ["workflow", "rule", "automation"],
    icon: Icon.Bolt,
  },
  {
    id: "approval-processes",
    title: "Approval Processes",
    category: "Automation",
    path: "/lightning/setup/ApprovalProcesses/home",
    keywords: ["approval", "workflow", "process"],
    icon: Icon.CheckCircle,
  },

  // Security
  {
    id: "session-settings",
    title: "Session Settings",
    category: "Security",
    path: "/lightning/setup/SecuritySession/home",
    keywords: ["session", "timeout", "security"],
    icon: Icon.Clock,
  },
  {
    id: "password-policies",
    title: "Password Policies",
    category: "Security",
    path: "/lightning/setup/SecurityPasswordPolicies/home",
    keywords: ["password", "security", "policy"],
    icon: Icon.Key,
  },
  {
    id: "login-access-policies",
    title: "Login Access Policies",
    category: "Security",
    path: "/lightning/setup/SecurityLoginAccessPolicies/home",
    keywords: ["login", "access", "security", "ip"],
    icon: Icon.Lock,
  },
  {
    id: "sharing-settings",
    title: "Sharing Settings",
    category: "Security",
    path: "/lightning/setup/SecuritySharing/home",
    keywords: ["sharing", "owd", "security", "access"],
    icon: Icon.Shield,
  },

  // Development
  {
    id: "apex-classes",
    title: "Apex Classes",
    category: "Development",
    path: "/lightning/setup/ApexClasses/home",
    keywords: ["apex", "class", "code", "development"],
    icon: Icon.Code,
  },
  {
    id: "apex-triggers",
    title: "Apex Triggers",
    category: "Development",
    path: "/lightning/setup/ApexTriggers/home",
    keywords: ["apex", "trigger", "code"],
    icon: Icon.Bolt,
  },
  {
    id: "visualforce-pages",
    title: "Visualforce Pages",
    category: "Development",
    path: "/lightning/setup/ApexPages/home",
    keywords: ["visualforce", "vf", "page"],
    icon: Icon.Document,
  },
  {
    id: "lightning-components",
    title: "Lightning Components",
    category: "Development",
    path: "/lightning/setup/LightningComponentBundles/home",
    keywords: ["lwc", "lightning", "component", "web"],
    icon: Icon.AppWindow,
  },
  {
    id: "custom-metadata-types",
    title: "Custom Metadata Types",
    category: "Development",
    path: "/lightning/setup/CustomMetadata/home",
    keywords: ["metadata", "custom", "type"],
    icon: Icon.Cog,
  },
  {
    id: "remote-site-settings",
    title: "Remote Site Settings",
    category: "Development",
    path: "/lightning/setup/SecurityRemoteProxy/home",
    keywords: ["remote", "site", "callout", "cors"],
    icon: Icon.Globe,
  },

  // Integrations
  {
    id: "connected-apps",
    title: "Connected Apps",
    category: "Integrations",
    path: "/lightning/setup/ConnectedApplication/home",
    keywords: ["connected", "app", "oauth", "integration"],
    icon: Icon.Plug,
  },
  {
    id: "named-credentials",
    title: "Named Credentials",
    category: "Integrations",
    path: "/lightning/setup/NamedCredential/home",
    keywords: ["credential", "authentication", "callout"],
    icon: Icon.Key,
  },

  // Data Management
  {
    id: "data-export",
    title: "Data Export",
    category: "Data Management",
    path: "/lightning/setup/DataManagementExport/home",
    keywords: ["export", "backup", "data"],
    icon: Icon.Upload,
  },
  {
    id: "mass-delete-records",
    title: "Mass Delete Records",
    category: "Data Management",
    path: "/lightning/setup/DataManagementDelete/home",
    keywords: ["delete", "mass", "records"],
    icon: Icon.Trash,
  },

  // Email Administration
  {
    id: "email-templates",
    title: "Email Templates",
    category: "Email Administration",
    path: "/lightning/setup/CommunicationTemplatesEmail/home",
    keywords: ["email", "template", "communication"],
    icon: Icon.Envelope,
  },
  {
    id: "deliverability",
    title: "Deliverability",
    category: "Email Administration",
    path: "/lightning/setup/OrgEmailSettings/home",
    keywords: ["email", "deliverability", "bounce"],
    icon: Icon.Envelope,
  },

  // Company Settings
  {
    id: "company-info",
    title: "Company Information",
    category: "Company Settings",
    path: "/lightning/setup/CompanyProfileInfo/home",
    keywords: ["company", "org", "information"],
    icon: Icon.Building,
  },
  {
    id: "fiscal-year",
    title: "Fiscal Year",
    category: "Company Settings",
    path: "/lightning/setup/FiscalYear/home",
    keywords: ["fiscal", "year", "period"],
    icon: Icon.Calendar,
  },
  {
    id: "business-hours",
    title: "Business Hours",
    category: "Company Settings",
    path: "/lightning/setup/BusinessHours/home",
    keywords: ["business", "hours", "support"],
    icon: Icon.Clock,
  },

  // Apps
  {
    id: "installed-packages",
    title: "Installed Packages",
    category: "Apps",
    path: "/lightning/setup/ImportedPackage/home",
    keywords: ["package", "installed", "managed"],
    icon: Icon.Box,
  },
  {
    id: "app-manager",
    title: "App Manager",
    category: "Apps",
    path: "/lightning/setup/NavigationMenus/home",
    keywords: ["app", "application", "lightning"],
    icon: Icon.AppWindow,
  },
];

export function SetupQuickLinksList({ initialOrg }: { initialOrg?: string } = {}) {
  const [recentPageIds, setRecentPageIds] = useState<string[]>([]);
  const [pinnedPageIds, setPinnedPageIds] = useState<string[]>([]);

  const { selectedOrg, setSelectedOrg, orgs } = useDefaultOrgSelection(initialOrg);

  useEffect(() => {
    async function loadData() {
      const recent = await getRecentSetupPages();
      const pinned = await getPinnedSetupPages();
      setRecentPageIds(recent);
      setPinnedPageIds(pinned);
    }
    loadData();
  }, []);

  const handleOpenPage = async (page: SetupPage, org: SalesforceOrg) => {
    await showToast({ style: Toast.Style.Animated, title: "Opening setup page…" });

    try {
      await openOrgToPage(org.alias || org.username, "custom", page.path);

      await addToRecentSetupPages(page.id);
      const updated = await getRecentSetupPages();
      setRecentPageIds(updated);

      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open page",
        message: String(error),
      });
    }
  };

  const handleTogglePin = async (pageId: string) => {
    await togglePinSetupPage(pageId);
    const updated = await getPinnedSetupPages();
    setPinnedPageIds(updated);

    const isPinned = updated.includes(pageId);
    await showToast({
      style: Toast.Style.Success,
      title: isPinned ? "Pinned" : "Unpinned",
    });
  };

  const pinnedPages = SETUP_PAGES.filter((p) => pinnedPageIds.includes(p.id));
  const recentPages = SETUP_PAGES.filter((p) => recentPageIds.includes(p.id) && !pinnedPageIds.includes(p.id));
  const categorizedPages = SETUP_PAGES.filter(
    (page) => !pinnedPageIds.includes(page.id) && !recentPageIds.includes(page.id),
  ).reduce(
    (acc, page) => {
      if (!acc[page.category]) {
        acc[page.category] = [];
      }
      acc[page.category].push(page);
      return acc;
    },
    {} as Record<string, SetupPage[]>,
  );

  const renderPageItem = (page: SetupPage, showCategory = false) => {
    const isPinned = pinnedPageIds.includes(page.id);
    const selectedOrgData = orgs?.find((o) => (o.alias || o.username) === selectedOrg);

    return (
      <List.Item
        key={page.id}
        icon={{ source: page.icon, tintColor: isPinned ? Color.Yellow : Color.Blue }}
        title={page.title}
        subtitle={showCategory ? page.category : undefined}
        accessories={isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : undefined}
        keywords={page.keywords}
        actions={
          <ActionPanel>
            {selectedOrgData && (
              <Action title="Open in Org" icon={Icon.Globe} onAction={() => handleOpenPage(page, selectedOrgData)} />
            )}

            <Action
              title={isPinned ? "Unpin Page" : "Pin Page"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() => handleTogglePin(page.id)}
            />

            <Action.CopyToClipboard title="Copy Path" content={page.path} shortcut={{ modifiers: ["cmd"], key: "c" }} />

            {selectedOrgData && (
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{
                  link: `${selectedOrgData.instanceUrl}${page.path}`,
                  name: page.title,
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      searchBarPlaceholder="Search setup pages..."
      searchBarAccessory={<OrgListDropdown value={selectedOrg} onChange={setSelectedOrg} />}
    >
      {!selectedOrg && (
        <List.EmptyView
          icon={Icon.Gear}
          title="Select an Org"
          description="Choose a Salesforce org to open setup pages"
        />
      )}

      {selectedOrg && (
        <>
          {pinnedPages.length > 0 && (
            <List.Section title="Pinned">{pinnedPages.map((page) => renderPageItem(page, true))}</List.Section>
          )}

          {recentPages.length > 0 && (
            <List.Section title="Recent">{recentPages.map((page) => renderPageItem(page, true))}</List.Section>
          )}

          {Object.entries(categorizedPages).map(([category, pages]) => (
            <List.Section key={category} title={category}>
              {pages.map((page) => renderPageItem(page))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

export default function Command() {
  return <SetupQuickLinksList />;
}
