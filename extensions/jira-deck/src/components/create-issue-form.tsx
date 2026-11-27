import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { typeIcon, userIcon } from "../lib/icons";
import { usePinnedBoards } from "../lib/pins";
import { Board, CreatedIssue, FieldErrors, NewIssue, ParentChoice, Sprint, SprintChoice, User } from "../lib/issue";
import { priorityIcon } from "../lib/priority";
import {
  createIssue,
  getCreateOptions,
  getCreateUrl,
  getBoardPeople,
  getLabels,
  getMyself,
  getParentChoices,
  getSpaces,
  getSprintChoices,
  getTypeFields,
  sourceKey,
} from "../lib/source";
import { ExtensionActions } from "./extension-actions";

const UNASSIGNED = "unassigned";
const BACKLOG = "backlog";
const NO_PARENT = "none";
const MAX_DESCRIPTION = 200;

function descriptionError(description?: string): string | undefined {
  const length = description?.length ?? 0;
  return length > MAX_DESCRIPTION ? `Keep it to ${MAX_DESCRIPTION} characters (${length} now)` : undefined;
}

export interface Values {
  summary: string;
  description: string;
  spaceKey: string;
  issueTypeId: string;
  priorityId: string;
  assigneeId: string;
  sprintId: string;
  parentKey: string;
  labels: string[];
  dueDate: Date | null;
}

export interface CreateIssueDefaults {
  /** The board the form was opened from. Its space is preselected and its sprints are offered. */
  board?: Board;
  /** The board's running sprint. */
  sprint?: Sprint;
  /** Preselects `sprint`, for forms opened from a running sprint. */
  addToSprint?: boolean;
  /** For forms opened while the list is filtered to one person. */
  assignee?: User;
}

interface Props {
  defaults?: CreateIssueDefaults;
  draftValues?: Partial<Values>;
  /** Typed in root search, as the command's argument. The form then starts at the description. */
  summary?: string;
  /** Called after Jira created the issue. Without it, the form clears for the next one. */
  onCreated?: (issue: CreatedIssue) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** "Sprint 42 · running, ends Fri 7 Nov" or "Sprint 43 · starts Mon 10 Nov". */
function sprintTitle(sprint: SprintChoice): string {
  if (sprint.state === "active")
    return `${sprint.name} · running${sprint.endDate ? `, ends ${shortDate(sprint.endDate)}` : ""}`;
  return `${sprint.name} · ${sprint.startDate ? `starts ${shortDate(sprint.startDate)}` : "planned"}`;
}

/** Jira wants the due date as a plain date, in the user's own calendar. */
function toJiraDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function CreateIssueForm({ defaults = {}, draftValues, summary, onCreated }: Props) {
  const key = sourceKey();
  const [lastSpace, setLastSpace] = useCachedState("create:space", "");
  const { data: spaces, isLoading: loadingSpaces } = useCachedPromise(
    (cacheKey: string) => {
      void cacheKey;
      return getSpaces();
    },
    [key],
    { failureToastOptions: { title: "Couldn't load spaces" } },
  );
  const { data: me } = useCachedPromise(
    (cacheKey: string) => {
      void cacheKey;
      return getMyself();
    },
    [key],
    { onError: () => undefined },
  );
  const pins = usePinnedBoards();
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const [parentSearch, setParentSearch] = useState("");
  // The picked parent stays listed while a search shows other ones.
  const [pickedParent, setPickedParent] = useState<ParentChoice>();
  // Set each render: sub-tasks can't be created without a parent.
  const needsParent = useRef(false);

  const { handleSubmit, itemProps, values, setValue, setValidationError, reset, focus } = useForm<Values>({
    initialValues: {
      // The rest of the order is in startSpace(), once spaces and pins are loaded.
      spaceKey: defaults.board?.spaceKey ?? "",
      assigneeId: defaults.assignee?.accountId ?? UNASSIGNED,
      sprintId: defaults.addToSprint && defaults.sprint ? defaults.sprint.id : BACKLOG,
      parentKey: NO_PARENT,
      labels: [],
      dueDate: null,
      ...draftValues,
      ...(summary ? { summary } : {}),
    },
    validation: {
      summary: (value) => (value?.trim() ? undefined : "Add a summary"),
      description: descriptionError,
      spaceKey: (value) => (value ? undefined : "Choose a space"),
      issueTypeId: (value) => (value ? undefined : "Choose a type"),
    },
    async onSubmit(values) {
      if (needsParent.current && values.parentKey === NO_PARENT) {
        setValidationError("parentKey", "Sub-tasks need a parent");
        return;
      }
      // Enter pressed twice must not create two issues.
      if (submitting.current) return;
      submitting.current = true;
      setIsSubmitting(true);

      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });
      try {
        const { issue, warning } = await createIssue(toNewIssue(values));
        toast.style = warning ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = warning ? `Created ${issue.key}, but not in the sprint` : `Created ${issue.key}`;
        toast.message = warning ?? issue.summary;
        toast.primaryAction = {
          title: "Open in Jira",
          shortcut: Keyboard.Shortcut.Common.Open,
          onAction: () => open(issue.url),
        };
        toast.secondaryAction = {
          title: "Copy Key",
          shortcut: Keyboard.Shortcut.Common.Copy,
          onAction: () => Clipboard.copy(issue.key),
        };
        setLastSpace(values.spaceKey);

        if (onCreated) {
          pop();
          onCreated(issue);
        } else {
          // Where it goes stays, for the next issue. What it says starts over.
          reset({ ...values, summary: "", description: "", labels: [], dueDate: null });
          focus("summary");
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't create the issue";
        toast.message = errorMessage(error);
        if (error instanceof FieldErrors) {
          for (const [field, message] of Object.entries(error.fields)) {
            if (field in values) setValidationError(field as keyof Values, message);
          }
        }
      } finally {
        submitting.current = false;
        setIsSubmitting(false);
      }
    },
  });

  const { data: options, isLoading: loadingOptions } = useCachedPromise(
    (spaceKey: string, cacheKey: string) => {
      void cacheKey;
      return getCreateOptions(spaceKey);
    },
    [values.spaceKey, key],
    { execute: Boolean(values.spaceKey), failureToastOptions: { title: "Couldn't load issue types" } },
  );
  const { data: typeFields, isLoading: loadingFields } = useCachedPromise(
    (spaceKey: string, issueTypeId: string, cacheKey: string) => {
      void cacheKey;
      return getTypeFields(spaceKey, issueTypeId);
    },
    [values.spaceKey, values.issueTypeId, key],
    {
      execute: Boolean(values.spaceKey && values.issueTypeId),
      failureToastOptions: { title: "Couldn't load the type's fields" },
    },
  );

  // Sprints and people come from the board the form was opened from, else a pinned board of the space,
  // else its first one. Kanban boards have no sprints.
  const spaceBoards = [
    ...(defaults.board && defaults.board.spaceKey === values.spaceKey ? [defaults.board] : []),
    ...pins.boards.filter((board) => board.spaceKey === values.spaceKey),
  ];
  const boardIds = spaceBoards.filter((board) => board.type !== "kanban").map((board) => board.id);
  const { data: boardPeople, isLoading: loadingPeople } = useCachedPromise(
    (spaceKey: string, boards: string, cacheKey: string) => {
      void cacheKey;
      return getBoardPeople(spaceKey, boards ? boards.split(",") : []);
    },
    [values.spaceKey, spaceBoards.map((board) => board.id).join(","), key],
    {
      execute: Boolean(values.spaceKey) && pins.ready,
      failureToastOptions: { title: "Couldn't load the board's people" },
    },
  );
  const { data: sprints, isLoading: loadingSprints } = useCachedPromise(
    (spaceKey: string, boards: string, cacheKey: string) => {
      void cacheKey;
      return getSprintChoices(spaceKey, boards ? boards.split(",") : []);
    },
    [values.spaceKey, boardIds.join(","), key],
    // Without sprints the issue goes to the backlog, which is fine.
    { execute: Boolean(values.spaceKey) && pins.ready, onError: () => undefined },
  );
  // A parent is one level up: an epic for a story, a story, task or bug for a sub-task.
  const issueType = options?.issueTypes.find((type) => type.id === values.issueTypeId);
  const isSubtask = issueType?.level === -1;
  const parentTypes = issueType ? (options?.issueTypes ?? []).filter((type) => type.level === issueType.level + 1) : [];
  const showParent = parentTypes.length > 0 && Boolean(typeFields?.hasParent || isSubtask);
  needsParent.current = isSubtask;
  const parentScope = `${values.spaceKey}|${parentTypes.map((type) => type.id).join(",")}`;
  const { data: parents, isLoading: loadingParents } = useCachedPromise(
    (scope: string, search: string, cacheKey: string) => {
      void cacheKey;
      const [spaceKey, typeIds] = scope.split("|");
      return getParentChoices(spaceKey, typeIds.split(","), search);
    },
    [parentScope, parentSearch, key],
    { execute: showParent, keepPreviousData: true, failureToastOptions: { title: "Couldn't load parents" } },
  );
  const { data: labels, isLoading: loadingLabels } = useCachedPromise(
    (cacheKey: string) => {
      void cacheKey;
      return getLabels();
    },
    [key],
    { execute: Boolean(typeFields?.hasLabels), onError: () => undefined },
  );

  /**
   * The chosen priority while the type allows it, else the default. Raycast picks the first item of a dropdown
   * whose value isn't one of them, so the dropdown never gets a value that isn't listed.
   */
  function shownPriority(priorityId: string): string {
    const allowed = typeFields?.priorities ?? [];
    if (allowed.some((priority) => priority.id === priorityId)) return priorityId;
    return typeFields?.defaultPriorityId ?? "";
  }

  function toNewIssue(values: Values): NewIssue {
    const sprint = sprints?.find((entry) => entry.id === values.sprintId);
    return {
      spaceId: spaces?.find((space) => space.key === values.spaceKey)?.id ?? "",
      spaceKey: values.spaceKey,
      issueTypeId: values.issueTypeId,
      summary: values.summary.trim(),
      description: values.description.trim() || undefined,
      priorityId: shownPriority(values.priorityId) || undefined,
      assigneeId: values.assigneeId === UNASSIGNED ? undefined : values.assigneeId,
      // Sub-tasks follow their parent's sprint.
      sprint: sprint && !isSubtask ? { id: sprint.id, name: sprint.name } : undefined,
      parentKey: showParent && values.parentKey !== NO_PARENT ? values.parentKey : undefined,
      labels: typeFields?.hasLabels && values.labels.length ? values.labels : undefined,
      dueDate: typeFields?.hasDueDate && values.dueDate ? toJiraDate(values.dueDate) : undefined,
    };
  }

  /** Opens Jira's own create screen with what's filled in so far. Nothing is saved until it's created there. */
  async function continueInJira(values: Values) {
    const tooLong = descriptionError(values.description);
    if (tooLong) {
      setValidationError("description", tooLong);
      return;
    }
    const url = getCreateUrl(toNewIssue(values));
    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "Add your Jira site in preferences first" });
      return;
    }
    await open(url);
    setLastSpace(values.spaceKey);
    if (onCreated) pop();
    else reset({ ...values, summary: "", description: "", labels: [], dueDate: null });
  }

  // Spaces of the pinned boards first, in their order, then the rest by name.
  const pinnedKeys = [...new Set(pins.boards.flatMap((board) => (board.spaceKey ? [board.spaceKey] : [])))];
  const yourSpaces = pinnedKeys.flatMap((spaceKey) => spaces?.filter((space) => space.key === spaceKey) ?? []);
  const otherSpaces = spaces?.filter((space) => !pinnedKeys.includes(space.key)) ?? [];

  /**
   * Where a new issue starts: the board it was opened from, else the default pinned board's space (or the next
   * pinned one with a single space), else the last space used, else the first one.
   */
  function startSpace(): string {
    const known = (spaceKey?: string) =>
      spaceKey && spaces?.some((space) => space.key === spaceKey) ? spaceKey : undefined;
    return known(defaults.board?.spaceKey) ?? yourSpaces[0]?.key ?? known(lastSpace) ?? spaces?.[0]?.key ?? "";
  }
  const spaceKnown = Boolean(spaces?.some((space) => space.key === values.spaceKey));
  // Raycast picks the first item of a dropdown whose value isn't one of them, so it always gets a listed one.
  const shownSpace = spaceKnown ? values.spaceKey : startSpace();

  useEffect(() => {
    if (pins.ready && spaces?.length && !spaceKnown) setValue("spaceKey", startSpace());
  }, [spaces, values.spaceKey, pins.ready]);

  // Types differ per space, so keep the choice only if the new space has it.
  useEffect(() => {
    if (options && !options.issueTypes.some((type) => type.id === values.issueTypeId)) {
      setValue("issueTypeId", options.issueTypes[0]?.id ?? "");
    }
  }, [options]);

  // Priorities differ per type. Jira's default, unless the current choice is still allowed.
  useEffect(() => {
    if (!typeFields) return;
    const allowed = typeFields.priorities ?? [];
    if (!allowed.some((priority) => priority.id === values.priorityId)) {
      setValue("priorityId", typeFields.defaultPriorityId ?? "");
    }
  }, [typeFields]);

  // Sprints and epics belong to the space, so another space starts from the backlog and no parent.
  useEffect(() => {
    if (sprints && values.sprintId !== BACKLOG && !sprints.some((sprint) => sprint.id === values.sprintId)) {
      setValue("sprintId", BACKLOG);
    }
  }, [sprints]);
  // Someone from another space's board can't stay picked.
  useEffect(() => {
    const kept = [
      me?.accountId,
      defaults.assignee?.accountId,
      ...(boardPeople ?? []).map((person) => person.accountId),
    ];
    if (boardPeople && values.assigneeId !== UNASSIGNED && !kept.includes(values.assigneeId)) {
      setValue("assigneeId", UNASSIGNED);
    }
  }, [boardPeople]);
  // Another space or level has other parents. The first scope, before types load, keeps a draft's parent.
  const lastParentScope = useRef(parentScope);
  useEffect(() => {
    const previous = lastParentScope.current;
    lastParentScope.current = parentScope;
    if (previous === parentScope || previous.endsWith("|")) return;
    setValue("parentKey", NO_PARENT);
    setPickedParent(undefined);
    setParentSearch("");
  }, [parentScope]);

  // Me, then the people working on the board. Anyone else can be picked in Jira.
  const isMe = (user: User) => user.accountId === me?.accountId;
  const onBoard = (boardPeople ?? []).filter((person) => !isMe(person));
  if (
    defaults.assignee &&
    !isMe(defaults.assignee) &&
    !onBoard.some((person) => person.accountId === defaults.assignee?.accountId)
  ) {
    onBoard.unshift(defaults.assignee);
  }
  const typeName = issueType?.name ?? "This type";
  const parentChoices = [
    ...(pickedParent && !parents?.some((parent) => parent.key === pickedParent.key) ? [pickedParent] : []),
    ...(parents ?? []),
  ];
  const missing = typeFields?.missingRequired ?? [];
  // Labels already chosen stay listed even if Jira's list doesn't have them yet.
  const labelChoices = [...new Set([...(labels ?? []), ...values.labels])];

  return (
    <Form
      navigationTitle="Create Issue"
      isLoading={
        loadingSpaces ||
        loadingOptions ||
        loadingFields ||
        loadingSprints ||
        loadingPeople ||
        loadingParents ||
        loadingLabels ||
        isSubmitting
      }
      enableDrafts={!onCreated}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" icon={Icon.Plus} onSubmit={handleSubmit} />
          {/* For fields the form doesn't have: nothing is saved until it's created in Jira. */}
          <Action.SubmitForm title="Continue in Jira" icon={Icon.Globe} onSubmit={continueInJira} />
          <ExtensionActions />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Summary"
        placeholder="What needs to be done?"
        autoFocus={!summary}
        {...itemProps.summary}
      />
      <Form.TextArea
        title="Description"
        placeholder="Optional. Markdown works."
        info={`${values.description?.length ?? 0} of ${MAX_DESCRIPTION} characters`}
        autoFocus={Boolean(summary)}
        enableMarkdown
        {...itemProps.description}
      />
      <Form.Separator />
      <Form.Dropdown title="Space" {...itemProps.spaceKey} value={shownSpace}>
        <Form.Dropdown.Section title={yourSpaces.length ? "From Your Boards" : undefined}>
          {yourSpaces.map((space) => (
            <Form.Dropdown.Item key={space.key} value={space.key} title={`${space.name} (${space.key})`} />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title={yourSpaces.length ? "All Spaces" : undefined}>
          {otherSpaces.map((space) => (
            <Form.Dropdown.Item key={space.key} value={space.key} title={`${space.name} (${space.key})`} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown title="Type" {...itemProps.issueTypeId}>
        {options?.issueTypes.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} icon={typeIcon(type.name)} />
        ))}
      </Form.Dropdown>
      {missing.length > 0 && (
        <Form.Description
          title="Needs Jira"
          text={`${typeName} also needs ${missing.join(", ")}. Continue in Jira (⌥↵) to fill ${missing.length === 1 ? "it" : "them"} in.`}
        />
      )}
      {typeFields?.priorities && (
        <Form.Dropdown title="Priority" {...itemProps.priorityId} value={shownPriority(values.priorityId)}>
          {typeFields.priorities.map((priority) => (
            <Form.Dropdown.Item
              key={priority.id}
              value={priority.id}
              title={priority.id === typeFields.defaultPriorityId ? `${priority.name} (Default)` : priority.name}
              icon={priorityIcon(priority.name)}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown
        title="Assignee"
        info="You and the people with issues on the space's board in the last 30 days. Assign anyone else in Jira."
        {...itemProps.assigneeId}
      >
        <Form.Dropdown.Item value={UNASSIGNED} title="Unassigned" icon={userIcon()} />
        {me && <Form.Dropdown.Item value={me.accountId} title={`${me.displayName} (Me)`} icon={userIcon(me)} />}
        <Form.Dropdown.Section title="On This Board">
          {onBoard.map((person) => (
            <Form.Dropdown.Item
              key={person.accountId}
              value={person.accountId}
              title={person.displayName}
              icon={userIcon(person)}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {((sprints?.length && !isSubtask) || showParent || typeFields?.hasLabels || typeFields?.hasDueDate) && (
        <Form.Separator />
      )}
      {sprints && sprints.length > 0 && !isSubtask && (
        <Form.Dropdown title="Sprint" {...itemProps.sprintId}>
          <Form.Dropdown.Item value={BACKLOG} title="Backlog" icon={Icon.Tray} />
          {sprints.map((sprint) => (
            <Form.Dropdown.Item
              key={sprint.id}
              value={sprint.id}
              title={sprintTitle(sprint)}
              icon={{
                source: Icon.ArrowClockwise,
                tintColor: sprint.state === "active" ? Color.Blue : Color.SecondaryText,
              }}
            />
          ))}
        </Form.Dropdown>
      )}
      {showParent && (
        <Form.Dropdown
          title="Parent"
          info={`Open ${parentTypes.map((type) => type.name).join(", ")} issues in this space. Type to search by key or summary.`}
          isLoading={loadingParents}
          filtering={false}
          throttle
          onSearchTextChange={setParentSearch}
          {...itemProps.parentKey}
          onChange={(parentKey) => {
            itemProps.parentKey.onChange?.(parentKey);
            setPickedParent(parentChoices.find((parent) => parent.key === parentKey));
          }}
        >
          <Form.Dropdown.Item value={NO_PARENT} title={isSubtask ? "Choose a parent" : "None"} icon={Icon.Minus} />
          {parentChoices.map((parent) => (
            <Form.Dropdown.Item
              key={parent.key}
              value={parent.key}
              title={`${parent.key} ${parent.summary}`}
              icon={typeIcon(parent.issueType)}
            />
          ))}
        </Form.Dropdown>
      )}
      {typeFields?.hasLabels && (
        <Form.TagPicker title="Labels" placeholder="Add label…" {...itemProps.labels}>
          {labelChoices.map((label) => (
            <Form.TagPicker.Item key={label} value={label} title={label} />
          ))}
        </Form.TagPicker>
      )}
      {typeFields?.hasDueDate && (
        <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />
      )}
    </Form>
  );
}
