import { getAccessToken } from "@raycast/utils";
import { getUrls } from "./oauth";

/** In Logbook a task and a log entry are the same thing. */
export interface LogEntry {
	id: string;
	text: string;
	completed: boolean;
	completedAt: string | null;
	position: number;
	scheduledDate: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedLogs {
	items: LogEntry[];
	nextCursor: string | null;
}

export type LogFilter = "all" | "pending" | "completed";

export function authHeaders(): Record<string, string> {
	const { token } = getAccessToken();
	return {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	};
}

export function logsUrl(params: { filter?: LogFilter; search?: string; limit?: number; cursor?: string } = {}) {
	const query = new URLSearchParams();
	if (params.filter) query.set("filter", params.filter);
	if (params.search) query.set("search", params.search);
	// Omitted on the first page; the API returns the next one as `nextCursor`.
	if (params.cursor) query.set("cursor", params.cursor);
	query.set("limit", String(params.limit ?? 50));
	return `${getUrls().api}/api/logs?${query.toString()}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await fetch(`${getUrls().api}${path}`, {
		...init,
		headers: { ...authHeaders(), ...init.headers },
	});

	if (!response.ok) {
		// The API's exception filter always returns { message }.
		const body = (await response.json().catch(() => null)) as {
			message?: string;
		} | null;
		throw new Error(body?.message ?? `Request failed (${response.status})`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	const text = await response.text();
	if (!text) {
		return undefined as T;
	}

	return JSON.parse(text) as T;
}

export function createTask(text: string) {
	return request<LogEntry>("/api/logs", {
		method: "POST",
		body: JSON.stringify({ text }),
	});
}

export function setTaskCompleted(id: string, completed: boolean) {
	return request<LogEntry>(`/api/logs/${id}`, {
		method: "PATCH",
		body: JSON.stringify({ completed }),
	});
}

export function deleteTask(id: string) {
	return request<void>(`/api/logs/${id}`, { method: "DELETE" });
}
