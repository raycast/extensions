import { getPreferenceValues } from "@raycast/api";
import { ofetch } from "ofetch";

const { apiKey } = getPreferenceValues<{ apiKey: string }>();

const client = ofetch.create({
	baseURL: "https://cacoo.com",
	onRequest: ({ options }) => {
		options.query ||= {};
		options.query.apiKey = apiKey;
	},
	parseResponse: JSON.parse,
});

export type GetOrganizationsResponse = {
	result: Array<{
		id: number;
		key: string;
		name: string;
		created: string;
		updated: string;
	}>;
	count: number;
};

export const getOrganizations = async () => {
	return client<GetOrganizationsResponse>("/api/v1/organizations.json");
};

export type GetDiagramsRequest = {
	organizationKey: string;
	offset?: number;
	limit?: number;
	type?: "all" | "own" | "shared" | "stencil" | "template" | "recyclebin";
	sortOn?: "updated" | "title" | "owner" | "folder";
	sortType?: "desc" | "asc";
	keyword?: string;
};

export type GetDiagramsResponse = {
	result: Array<{
		url: string;
		imageUrl: string;
		imageUrlForApi: string;
		diagramId: string;
		title: string;
		description: string;
		owner: {
			name: string;
			nickname: string;
			type: "cacoo" | "other";
			imageUrl: string;
		};
		folderId: number;
		folderName: string;
	}>;
	count: number;
};

export const getDiagrams = async (request: GetDiagramsRequest) => {
	return client<GetDiagramsResponse>("/api/v1/diagrams.json", {
		query: request,
	});
};

export type GetDiagramByIdRequest = {
	diagramId: string;
};

export type GetDiagramByIdResponse = {
	sheets: Array<{
		url: string;
		name: string;
		imageUrlForApi: string;
		comments: [];
	}>;
};

export const getDiagramById = async (request: GetDiagramByIdRequest) => {
	return client<GetDiagramByIdResponse>(
		`/api/v1/diagrams/${request.diagramId}.json`,
	);
};

export const withApiKey = (input: string) => {
	const url = new URL(input);
	url.searchParams.set("apiKey", apiKey);
	return url.href;
};
