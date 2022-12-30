import { cloudflowBaseUrl, cloudflowPluginSuiteBaseUrl } from "./preferences";
import { Workspace } from "../types"

/**
 * Workspaces
 */

const workspaces: Workspace[] = [
	{
		name: "Home",
		url: `${cloudflowBaseUrl}/portal.cgi?home=1`
	},
	{
		name: "Notifications",
		url: `${cloudflowBaseUrl}/portal.cgi?notifications=1`
	},
	{
		name: "Kiosk",
		url: `${cloudflowBaseUrl}/portal.cgi?hub&topbar=true`
	},
	{
		name: "Assets",
		url: `${cloudflowBaseUrl}/portal.cgi?asset=X`
	},
	{
		name: "Flows",
		url: `${cloudflowBaseUrl}/portal.cgi?quantum`
	},
	{
		name: "Approval Templates",
		url: `${cloudflowBaseUrl}/portal.cgi?chains=1#emailtemplates`
	},
	{
		name: "All Approvals",
		url: `${cloudflowBaseUrl}/portal.cgi?chains=1#all_approvals`
	},
	{
		name: "My Approvals",
		url: `${cloudflowBaseUrl}/portal.cgi?chains=1#my_approvals`
	},
	{
		name: "Team Approvals",
		url: `${cloudflowBaseUrl}/portal.cgi?chains=1#team_approvals`
	},
	{
		name: "All Tasks",
		url: `${cloudflowBaseUrl}/?task_list=allTasks`
	},
	{
		name: "My Task",
		url: `${cloudflowBaseUrl}/?task_list=myTasks`
	},
	{
		name: "All Callendars",
		url: `${cloudflowBaseUrl}/?calendar=allCalendars`
	},
	{
		name: "Jobs - Configuration",
		url: `${cloudflowBaseUrl}/?job=configuration`
	},
	{
		name: "Jobs - Form Manager",
		url: `${cloudflowBaseUrl}/?form=editor`
	},
	{
		name: "Jobs - Teams",
		url: `${cloudflowBaseUrl}/?team=teams`
	},
	{
		name: "Jobs - Resources",
		url: `${cloudflowBaseUrl}/?job=resource.configuration`
	},
	{
		name: "RIP - Jobs",
		url: `${cloudflowBaseUrl}/standalone_rip_nebula.html#jobs`
	},
	{
		name: "RIP - Presets",
		url: `${cloudflowBaseUrl}/standalone_rip_nebula.html#presets`
	},
	{
		name: "RIP - Curves",
		url: `${cloudflowBaseUrl}/standalone_rip_nebula.html#curves`
	},
	{
		name: "RIP - Profiles",
		url: `${cloudflowBaseUrl}/standalone_rip_nebula.html#colorprofiles`
	},
	{
		name: "MARS",
		url: `${cloudflowBaseUrl}/appsnebula/index.html`
	},
	{
		name: "Manual",
		url: `${cloudflowBaseUrl}/manual/manual.html`
	},
	{
		name: "API - Javascript",
		url: `${cloudflowBaseUrl}/portal.cgi?api=getJavaScriptDocumentation`
	},
	{
		name: "API - Web Service",
		url: `${cloudflowBaseUrl}/portal.cgi?api=getWebServiceDocumentation`
	},
	{
		name: "Inspect Collection",
		url: `${cloudflowBaseUrl}/mongoCloud/mongoCloud_nebula.html`
	},
	{
		name: "Standalone VDP",
		url: `${cloudflowBaseUrl}/portal.cgi/__CloudflowApps/VDP/jobStation.html`
	},
	{
		name: "Tectonics - Queues",
		url: `${cloudflowBaseUrl}/portal.cgi/__CloudflowApps/tectonics/application/queues-main.html`
	},
	{
		name: "Patchplanner",
		url: `${cloudflowBaseUrl}/portal.cgi?patchplanner=1`
	},
	{
		name: "Dashboard - Main",
		url: `${cloudflowBaseUrl}/portal.cgi?portal=dashboard`
	},
	{
		name: "Dashboard - Proofscope Live Renderers",
		url: `${cloudflowBaseUrl}/portal.cgi?proofscope=live_renderers`
	},
	{
		name: "Dashboard - Logs",
		url: `${cloudflowBaseUrl}/portal.cgi?logging=1`
	},
	{
		name: "Dashboard - Workables",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#workables`
	},
	{
		name: "Main Settings",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#settings`
	},
	{
		name: "Contacts",
		url: `${cloudflowBaseUrl}/portal.cgi?manageusers=1`
	},
	{
		name: "Users",
		url: `${cloudflowBaseUrl}/portal.cgi?manageusers=1&usersonly=true`
	},
	{
		name: "Scopes",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#scopes`
	},
	{
		name: "Share - Sites",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#share_sites`
	},
	{
		name: "Share - Sync Specifications",
		url: `${cloudflowBaseUrl}/portal.cgi?share=1`
	},
	{
		name: "Share - Activities",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#share_activity`
	},
	{
		name: "DataLink",
		url: `${cloudflowBaseUrl}/portal.cgi/__CloudflowApps/datalink/datalink.html`
	},
	{
		name: "Filestores",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#filestores`
	},
	{
		name: "Folder Mappings",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#foldermappingtable`
	},
	{
		name: "Work Servers",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#workers`
	},
	{
		name: "Resources",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#resources`
	},
	{
		name: "Paper Definitions",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#outputdevices`
	},
	{
		name: "System Tools",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#maintenance`
	},
	{
		name: "License",
		url: `${cloudflowBaseUrl}/portal.cgi?config=1#license`
	},
	{
		name: "User Preferences",
		url: `${cloudflowBaseUrl}/?user_preferences=1`
	},
	{
		name: "Plug-In Suite Preferences",
		url: `${cloudflowPluginSuiteBaseUrl}/frameCGI/Resource/Web/Frame/preferences_nebula.html`
	},
] 

export default workspaces
