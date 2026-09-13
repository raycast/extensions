export const SEARCH_FILTERS_STORAGE_KEY = "ticktick.searchFilters.v1";
export const LEGACY_SEARCH_PROJECT_FILTER_KEY = "searchProjectFilter";

export type PersistedSearchFilterStatus = "open" | "completed" | "all";

export type PersistedSearchFilters = Readonly<{
  status: PersistedSearchFilterStatus;
  projectId?: string;
}>;

export interface TaskFilterStoragePort {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DEFAULT_SEARCH_FILTERS: PersistedSearchFilters = Object.freeze({ status: "open" });

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is PersistedSearchFilterStatus {
  return value === "open" || value === "completed" || value === "all";
}

function isSafeOpaqueProjectId(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return !Array.from(value).some((character) => /\p{Cf}/u.test(character));
}

function createFilters(status: PersistedSearchFilterStatus, projectId?: string): PersistedSearchFilters {
  return Object.freeze(projectId === undefined ? { status } : { status, projectId });
}

function normalizeSearchFilters(value: unknown): PersistedSearchFilters {
  try {
    if (!isRecord(value) || !hasOwn(value, "status")) return DEFAULT_SEARCH_FILTERS;

    const statusSnapshot = value.status;
    if (!isStatus(statusSnapshot)) return DEFAULT_SEARCH_FILTERS;

    if (!hasOwn(value, "projectId")) return createFilters(statusSnapshot);

    const projectIdSnapshot = value.projectId;
    if (projectIdSnapshot === undefined) return createFilters(statusSnapshot);
    if (!isSafeOpaqueProjectId(projectIdSnapshot)) return DEFAULT_SEARCH_FILTERS;

    return createFilters(statusSnapshot, projectIdSnapshot);
  } catch {
    return DEFAULT_SEARCH_FILTERS;
  }
}

export function parseSearchFilters(raw: unknown): PersistedSearchFilters {
  if (typeof raw !== "string") return DEFAULT_SEARCH_FILTERS;

  try {
    return normalizeSearchFilters(JSON.parse(raw));
  } catch {
    return DEFAULT_SEARCH_FILTERS;
  }
}

export function serializeSearchFilters(filters: PersistedSearchFilters): string {
  const safeFilters = normalizeSearchFilters(filters);
  return JSON.stringify(
    safeFilters.projectId === undefined
      ? { status: safeFilters.status }
      : { status: safeFilters.status, projectId: safeFilters.projectId }
  );
}

export async function loadSearchFilters(storage: TaskFilterStoragePort): Promise<PersistedSearchFilters> {
  let atomicValue: string | undefined;
  try {
    atomicValue = await storage.getItem(SEARCH_FILTERS_STORAGE_KEY);
  } catch {
    return DEFAULT_SEARCH_FILTERS;
  }

  if (atomicValue !== undefined) return parseSearchFilters(atomicValue);

  let legacyValue: string | undefined;
  try {
    legacyValue = await storage.getItem(LEGACY_SEARCH_PROJECT_FILTER_KEY);
  } catch {
    return DEFAULT_SEARCH_FILTERS;
  }

  let migrated: PersistedSearchFilters;
  if (legacyValue === "all") {
    migrated = createFilters("open");
  } else if (isSafeOpaqueProjectId(legacyValue)) {
    migrated = createFilters("open", legacyValue);
  } else {
    return DEFAULT_SEARCH_FILTERS;
  }

  try {
    await storage.setItem(SEARCH_FILTERS_STORAGE_KEY, serializeSearchFilters(migrated));
  } catch {
    return migrated;
  }

  try {
    await storage.removeItem(LEGACY_SEARCH_PROJECT_FILTER_KEY);
  } catch {
    // The atomic value is authoritative after a successful write.
  }

  return migrated;
}

export class TaskFilterPreferenceStore {
  private currentValue: PersistedSearchFilters = DEFAULT_SEARCH_FILTERS;
  private operationQueue: Promise<void> = Promise.resolve();
  private revision = 0;

  constructor(private readonly storage: TaskFilterStoragePort) {}

  get value(): PersistedSearchFilters {
    return this.currentValue;
  }

  async load(): Promise<PersistedSearchFilters> {
    const revisionAtStart = this.revision;
    return this.enqueue(async () => {
      const loaded = await loadSearchFilters(this.storage);
      if (this.revision === revisionAtStart) this.currentValue = loaded;
      return this.currentValue;
    });
  }

  write(filters: PersistedSearchFilters): Promise<void> {
    const safeFilters = normalizeSearchFilters(filters);
    const serialized = serializeSearchFilters(safeFilters);
    this.currentValue = safeFilters;
    this.revision += 1;

    const write = async () => {
      try {
        await this.storage.setItem(SEARCH_FILTERS_STORAGE_KEY, serialized);
      } catch {
        // The in-memory selection remains safe and later queued writes still run.
      }
    };

    return this.enqueue(write);
  }

  private enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    const queued = this.operationQueue.then(operation, operation);
    this.operationQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }
}
