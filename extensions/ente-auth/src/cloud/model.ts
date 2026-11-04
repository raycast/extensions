import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY } from "../constants/secrets";
import { Secret } from "../helpers/types";
import { getSession, rejectSession, signOut } from "./auth";
import { loadCache } from "./cache";
import { decryptSnapshot } from "./crypto";
import { CloudError, safeMessage } from "./errors";
import { assertCurrent, getMode, hasImportedEntries, ModeState } from "./storage";
import { syncSession } from "./sync";
import { Session, SyncStatus } from "./types";

export interface TOTPState {
	mode: "cloud" | "import";
	hasSession: boolean;
	hasImportedEntries: boolean;
	entries: Secret[];
	status: SyncStatus;
	loading: boolean;
	lastSyncedAt?: number;
	error?: string;
	apiOrigin?: string;
}

export const initialTOTPState: TOTPState = {
	mode: "cloud",
	hasSession: false,
	hasImportedEntries: false,
	entries: [],
	status: "Sign-in required",
	loading: true,
};

export class TOTPModel {
	state: TOTPState = { ...initialTOTPState };

	private session: Session | null = null;
	private mode?: ModeState;
	private controller = new AbortController();
	private disposed = false;
	private started?: Promise<void>;
	private pending?: Promise<void>;
	private cacheError?: string;
	private timer?: ReturnType<typeof setInterval>;

	constructor(private readonly notify: (state: TOTPState) => void = () => undefined) {}

	private update(change: Partial<TOTPState>) {
		if (this.disposed) {
			return;
		}

		this.state = {
			...this.state,
			...change,
			hasSession: this.session !== null,
			apiOrigin: this.session?.apiOrigin,
		};
		this.notify(this.state);
	}

	start(): Promise<void> {
		if (this.disposed) {
			return Promise.resolve();
		}

		if (!this.started) {
			this.timer = setInterval(() => void this.tick(), 1000);
			this.started = this.load();
		}

		return this.started;
	}

	private async load(): Promise<void> {
		try {
			this.mode = await getMode();
			if (this.disposed) {
				return;
			}

			this.update({ mode: this.mode.mode });
			if (this.mode.mode === "import") {
				await this.refresh();
				return;
			}

			this.update({ hasImportedEntries: await hasImportedEntries().catch(() => false) });
			this.session = await getSession();
			if (this.disposed) {
				this.session = null;
				return;
			}

			if (!this.session) {
				this.update({ loading: false, status: "Sign-in required" });
				return;
			}

			await this.loadCachedEntries(this.session);
			await this.refresh();
		} catch (error) {
			this.update({
				loading: false,
				entries: [],
				status:
					error instanceof CloudError && error.kind === "cancelled" ? "Sign-in required" : "Sync failed",
				error: safeMessage(error),
			});
		}
	}

	private async loadCachedEntries(session: Session): Promise<void> {
		try {
			const cache = await loadCache(session, this.controller.signal);
			if (!cache) {
				return;
			}

			const entries = await decryptSnapshot(cache, session);
			await assertCurrent(session.id, this.controller.signal, true);

			this.update({ entries, lastSyncedAt: cache.syncedAt, loading: false, status: "Syncing" });
		} catch (error) {
			if (error instanceof CloudError && error.kind === "cancelled") {
				throw error;
			}

			this.cacheError = safeMessage(error);
			this.update({ error: this.cacheError });
		}
	}

	refresh(): Promise<void> {
		if (this.pending) {
			return this.pending;
		}

		if (this.disposed) {
			return Promise.resolve();
		}

		this.pending = this.runSync().finally(() => {
			this.pending = undefined;
		});

		return this.pending;
	}

	private async runSync(): Promise<void> {
		if (this.state.mode === "import") {
			await this.loadImportedEntries();
			return;
		}

		const session = this.session;
		if (!session) {
			return;
		}

		this.update({ status: "Syncing", error: undefined });

		try {
			const result = await syncSession(session, this.controller.signal);
			await assertCurrent(session.id, this.controller.signal, true);

			this.cacheError = undefined;
			this.update({
				entries: result.entries,
				status: "Up to date",
				lastSyncedAt: result.snapshot.syncedAt,
				loading: false,
				error: undefined,
			});
		} catch (error) {
			await this.handleSyncFailure(session, error);
		}
	}

	private async loadImportedEntries(): Promise<void> {
		try {
			const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
			const entries: unknown = JSON.parse(raw || "[]");
			if (!Array.isArray(entries)) {
				throw new Error("Invalid import data");
			}

			this.update({ entries, hasImportedEntries: entries.length > 0, loading: false, error: undefined });
		} catch {
			this.update({
				entries: [],
				loading: false,
				error: "Imported entries could not be read. Run Import Secrets again.",
			});
		}
	}

	private async handleSyncFailure(session: Session, error: unknown): Promise<void> {
		if (this.disposed) {
			return;
		}

		if (error instanceof CloudError && (error.kind === "unauthorized" || error.kind === "cancelled")) {
			this.session = null;
			this.update({
				entries: [],
				loading: false,
				status: "Sign-in required",
				lastSyncedAt: undefined,
				error: safeMessage(error),
			});

			if (error.kind === "unauthorized") {
				await rejectSession(session).catch(() => undefined);
			}

			return;
		}

		const offline = !this.cacheError && error instanceof CloudError && error.kind === "network";
		this.update({
			loading: false,
			status: offline ? "Offline" : "Sync failed",
			error: [this.cacheError, safeMessage(error)].filter(Boolean).join(" "),
		});
	}

	async tick(): Promise<void> {
		if (this.disposed || !this.mode) {
			return;
		}

		try {
			const mode = await getMode();
			const session = this.session;
			const rejected = session && (await getSession())?.id !== session.id;
			if (mode.revision !== this.mode.revision || mode.mode !== this.mode.mode || rejected) {
				this.controller.abort();
				this.session = null;
				this.update({
					entries: [],
					loading: false,
					status: "Sign-in required",
					lastSyncedAt: undefined,
					error: "The account or mode changed. Open Get TOTP again.",
				});
				return;
			}

			// The timer updates local codes and imports without making cloud requests.
			if (mode.mode === "import") {
				await this.refresh();
			} else {
				this.update({});
			}
		} catch {
			this.controller.abort();
			this.session = null;
			this.update({
				entries: [],
				loading: false,
				status: "Sign-in required",
				error: "Saved account state could not be read. Sign in again.",
			});
		}
	}

	async removeImportedEntries(): Promise<void> {
		await LocalStorage.removeItem(STORAGE_KEY);
		this.update({ hasImportedEntries: false });
	}

	async signOut(mode: "cloud" | "import" = "cloud"): Promise<void> {
		this.controller.abort();
		this.session = null;
		this.update({
			entries: [],
			loading: false,
			status: "Sign-in required",
			lastSyncedAt: undefined,
			error: undefined,
		});
		await signOut(mode);
	}

	dispose(): void {
		this.disposed = true;
		this.controller.abort();
		clearInterval(this.timer);
		this.session = null;
		this.state = { ...this.state, entries: [], hasSession: false, apiOrigin: undefined };
	}
}
