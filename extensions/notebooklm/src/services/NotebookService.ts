import { PopToRootType, closeMainWindow } from "@raycast/api";
import { IBrowserDriver } from "../drivers";
import { NotebookLMTab, TabInfo, TabList } from "../types";
import { Notebook, SourceStatus, Ownership } from "../types";
import { transformNotebook } from "../utils/transformData";
import { SummaryService } from "./SummaryService";

type LoadingEvent = { scope: string; status: boolean };
type NotebooksUpdatedEvent = Notebook[];
type TabListUpdatedEvent = TabList;
type EventData = LoadingEvent | NotebooksUpdatedEvent | TabListUpdatedEvent | undefined;

type Listener = (data?: EventData) => void;

export class NotebookService {
  private driver: IBrowserDriver;
  private summaryService: SummaryService;
  private listeners: Record<string, Listener[]> = {};

  public notebooks: Notebook[] = [];
  public tabList: TabList | null = null;
  private tab: NotebookLMTab | null = null;
  private setSourceId!: (sourceId: string) => void;
  private _newSourceId: Promise<string> = new Promise<string>((resolve) => {
    this.setSourceId = resolve;
  });

  public async getNewSourceId(): Promise<string> {
    const currentPromise = await this._newSourceId;
    this._newSourceId = new Promise<string>((resolve) => {
      this.setSourceId = resolve;
    });
    return currentPromise;
  }

  constructor(driver: IBrowserDriver, summaryService: SummaryService) {
    this.driver = driver;
    this.summaryService = summaryService;
  }

  public subscribe(event: string, callback: Listener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter((l) => l !== callback);
    };
  }

  private emit(event: string, data?: EventData) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  private async readyForAction(): Promise<boolean> {
    this.emit("loading", { scope: "notebooks", status: true });
    if (!this.tab) {
      this.tab = await this.driver.openTab();
      if (!this.tab) {
        this.emit("loading", { scope: "notebooks", status: false });
        return false;
      }

      let isLogin = await this.driver.checkLogin(this.tab);
      if (!isLogin) {
        await closeMainWindow({ popToRootType: PopToRootType.Suspended });
        await this.driver.selectTab(this.tab, true);
        isLogin = await this.driver.detectLogin(this.tab, 120000);
        if (!isLogin) {
          this.emit("loading", { scope: "notebooks", status: false });
          await this.driver.closeTab(this.tab);
          this.tab = null;
          return false;
        }
      }

      const tokens = await this.driver.extractTokens(this.tab);
      if (tokens) {
        this.tab.tokens = tokens;
      } else {
        this.emit("loading", { scope: "notebooks", status: false });
        await this.driver.closeTab(this.tab);
        this.tab = null;
        return false;
      }
    }
    return true;
  }

  private async performAction(action: (tab: NotebookLMTab) => Promise<void>) {
    const isReady = await this.readyForAction();
    if (!isReady) {
      return;
    }
    try {
      await action(this.tab!);
      await this.getNotebooks();
    } catch (error) {
      console.error("Failed to perform action:", error);
      this.emit("loading", { scope: "notebooks", status: false });
    } finally {
      if (this.tab) {
        await this.driver.closeTab(this.tab);
        this.tab = null;
      }
    }
  }

  public async getNotebooks(): Promise<void> {
    const isReady = await this.readyForAction();
    if (!isReady) return;

    try {
      const response = await this.driver.fetchData(this.tab!);
      let fetchedNotebooks = transformNotebook(response);

      let attempt = 0;
      const maxRetries = 5;
      while (!this.validateNotebooks(fetchedNotebooks) && attempt < maxRetries) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
        fetchedNotebooks = transformNotebook(await this.driver.fetchData(this.tab!));
        attempt++;
      }

      this.notebooks = fetchedNotebooks;
      this.emit("notebooksUpdated", this.notebooks);
      this.emit("loading", { scope: "notebooks", status: false });

      // Delegate summary synchronization to SummaryService
      await this.summaryService.syncSummaries(this.notebooks, this.tab!);
    } catch (error) {
      console.error("Failed to get notebooks:", error);
      this.emit("loading", { scope: "notebooks", status: false });
    } finally {
      if (this.tab) {
        await this.driver.closeTab(this.tab!);
        this.tab = null;
      }
    }
  }

  public async addTabs(tabList: TabInfo[], notebookId?: string): Promise<void> {
    await this.performAction(async (tab) => {
      if (!notebookId) {
        const newNotebook = await this.driver.createNewNotebook(tab);
        notebookId = JSON.parse(JSON.parse(newNotebook)[0][0][2])[2];
        console.log(notebookId);
      }
      await this.driver.uploadTabs(tab, tabList, notebookId!);
    });
  }

  public async addPasteText(text: string, notebookId?: string): Promise<void> {
    await this.performAction(async (tab) => {
      if (!notebookId) {
        const newNotebook = await this.driver.createNewNotebook(tab);
        notebookId = JSON.parse(JSON.parse(newNotebook)[0][0][2])[2];
      }
      const responses = await this.driver.uploadPasteText(tab, notebookId!, text);
      const response = JSON.parse(responses)[0];
      const sourceId = JSON.parse(response[0][2])[0][0][0][0];
      this.setSourceId(sourceId);
    });
  }

  public async delNotebooks(notebookIds: string[]): Promise<void> {
    await this.performAction(async (tab) => {
      // Separate notebooks based on ownership
      const notOwnerNotebookIds: string[] = [];

      notebookIds = notebookIds.filter((id) => {
        const notebook = this.notebooks.find((nb) => nb.id === id);
        if (notebook) {
          if (notebook.owned === Ownership.Owner) {
            return id;
          } else {
            notOwnerNotebookIds.push(id);
          }
        }
      });

      // Delete owner notebooks
      if (notebookIds.length > 0) {
        await this.driver.deleteNotebook(tab, notebookIds);
      }

      // Delete shared notebooks
      if (notOwnerNotebookIds.length > 0) {
        await this.driver.deleteNotOwnedNotebook(tab, notOwnerNotebookIds);
      }
    });
  }

  public async delSources(sourceIds: string[]): Promise<void> {
    await this.performAction(async (tab) => this.driver.deleteSource(tab, sourceIds));
  }

  public async editNotebookTitle(notebookId: string, title: string): Promise<void> {
    await this.performAction((tab) => this.driver.editNotebookTitle(tab, notebookId, title));
  }

  public async editSourceTitle(sourceId: string, title: string): Promise<void> {
    await this.performAction((tab) => this.driver.editSourceTitle(tab, sourceId, title));
  }

  public async resetAllSummaries(): Promise<void> {
    await this.summaryService.deleteAll();
    await this.getNotebooks();
  }

  public async reloadSummary(notebookId: string, sourceId: string): Promise<void> {
    await this.summaryService.deleteOne(notebookId, sourceId);
    await this.getNotebooks();
  }

  private validateNotebooks(notebooks: Notebook[]): boolean {
    if (!notebooks) return true;
    return !notebooks.some(
      (nb) =>
        (nb.title === "" && nb.sources.length > 0) ||
        nb.sources.some((src) => src.status === SourceStatus.Loading_0 || src.status === SourceStatus.Loading_1),
    );
  }

  public async getTabList(): Promise<void> {
    this.emit("loading", { scope: "tabList", status: true });
    try {
      const tabList = await this.driver.getTabList();
      this.tabList = tabList;
      this.emit("tabListUpdated", this.tabList);
    } catch (error) {
      console.error("Failed to get tab list:", error);
    } finally {
      this.emit("loading", { scope: "tabList", status: false });
    }
  }
}
