import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast, useFetch, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { authHeaders, createTask, deleteTask, LogFilter, logsUrl, PaginatedLogs, setTaskCompleted } from "./api";
import { getUrls, logbook } from "./oauth";

const FILTERS: { id: LogFilter; label: string }[] = [
	{ id: "pending", label: "Pending" },
	{ id: "completed", label: "Completed" },
	{ id: "all", label: "All" },
];

function ListTasks() {
	const [filter, setFilter] = useState<LogFilter>("pending");
	const [search, setSearch] = useState("");

	const { isLoading, data, revalidate, mutate } = useFetch<PaginatedLogs>(logsUrl({ filter, search }), {
		headers: authHeaders(),
		keepPreviousData: true,
		failureToastOptions: { title: "Could not load your logbook" },
	});

	const tasks = data?.items ?? [];

	// Actions update optimistically and roll back on failure.
	const toggleCompleted = async (id: string, completed: boolean) => {
		try {
			await mutate(setTaskCompleted(id, completed), {
				optimisticUpdate: (current) =>
					current && {
						...current,
						items: current.items.map((task) => (task.id === id ? { ...task, completed } : task)),
					},
				shouldRevalidateAfter: true,
			});
			await showToast({
				style: Toast.Style.Success,
				title: completed ? "Marked complete" : "Marked pending",
			});
		} catch (error) {
			await showFailureToast(error, { title: "Could not update task" });
		}
	};

	const removeTask = async (id: string, text: string) => {
		const confirmed = await confirmAlert({
			title: "Delete task?",
			message: text,
			primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
		});
		if (!confirmed) return;

		try {
			await mutate(deleteTask(id), {
				optimisticUpdate: (current) =>
					current && {
						...current,
						items: current.items.filter((task) => task.id !== id),
					},
				shouldRevalidateAfter: true,
			});
			await showToast({ style: Toast.Style.Success, title: "Deleted" });
		} catch (error) {
			await showFailureToast(error, { title: "Could not delete task" });
		}
	};

	// The search box doubles as a capture field.
	const addTyped = async () => {
		const text = search.trim();
		if (!text) return;
		try {
			await createTask(text);
			await showToast({ style: Toast.Style.Success, title: `Added "${text}"` });
			setSearch("");
			revalidate();
		} catch (error) {
			await showFailureToast(error, { title: "Could not add task" });
		}
	};

	const typedIsNew = search.trim().length > 0 && !tasks.some((task) => task.text.trim() === search.trim());

	return (
		<List
			isLoading={isLoading}
			searchText={search}
			onSearchTextChange={setSearch}
			searchBarPlaceholder="Search your logbook, or type a new task…"
			searchBarAccessory={
				<List.Dropdown tooltip="Filter" value={filter} onChange={(value) => setFilter(value as LogFilter)}>
					{FILTERS.map((option) => (
						<List.Dropdown.Item key={option.id} title={option.label} value={option.id} />
					))}
				</List.Dropdown>
			}
		>
			{typedIsNew && (
				<List.Section title="Create">
					<List.Item
						icon={{ source: Icon.Plus, tintColor: Color.Green }}
						title={`Add "${search.trim()}"`}
						actions={
							<ActionPanel>
								<Action title="Add Task" icon={Icon.Plus} onAction={addTyped} />
							</ActionPanel>
						}
					/>
				</List.Section>
			)}

			<List.Section title="Tasks" subtitle={tasks.length ? `${tasks.length}` : undefined}>
				{tasks.map((task) => (
					<List.Item
						key={task.id}
						icon={
							task.completed
								? { source: Icon.CheckCircle, tintColor: Color.Green }
								: { source: Icon.Circle, tintColor: Color.SecondaryText }
						}
						title={task.text || "Untitled"}
						accessories={task.completed ? [{ tag: { value: "Done", color: Color.Green } }] : undefined}
						actions={
							<ActionPanel>
								<Action
									title={task.completed ? "Mark as Pending" : "Mark as Complete"}
									icon={task.completed ? Icon.Circle : Icon.CheckCircle}
									onAction={() => toggleCompleted(task.id, !task.completed)}
								/>
								<Action.CopyToClipboard
									title="Copy Text"
									content={task.text}
									shortcut={{ modifiers: ["cmd"], key: "c" }}
								/>
								<Action.OpenInBrowser
									title="Open in Logbook"
									url={getUrls().web}
									shortcut={Keyboard.Shortcut.Common.Open}
								/>
								<Action
									title="Delete Task"
									icon={Icon.Trash}
									style={Action.Style.Destructive}
									shortcut={{ modifiers: ["ctrl"], key: "x" }}
									onAction={() => removeTask(task.id, task.text)}
								/>
								<Action
									title="Refresh"
									icon={Icon.ArrowClockwise}
									shortcut={Keyboard.Shortcut.Common.Refresh}
									onAction={revalidate}
								/>
							</ActionPanel>
						}
					/>
				))}
			</List.Section>

			<List.EmptyView
				icon={Icon.Tray}
				title={search ? "No matching tasks" : "Nothing here yet"}
				description={search ? "Press Enter on the Create row above to add it." : "Type above to add your first task."}
			/>
		</List>
	);
}

export default withAccessToken(logbook)(ListTasks);
