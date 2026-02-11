export interface Preferences {
	orderBy: "views" | "alphabetical";
	limitPreviewLOC: boolean;
	maximumPreviewLOC: string;
	github_token?: string;
	gitlab_token?: string;
	bitbucket_token?: string;
	azure_token?: string;
}
