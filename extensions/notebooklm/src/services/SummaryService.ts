import { Notebook, Source, SourceStatus } from "../types";
import { IBrowserDriver } from "../drivers";
import { NotebookLMTab } from "../types";
import {
  addSummary,
  deleteAllSummaries,
  deleteRemovedSummary,
  deleteSummary,
  getSummaries,
  SourceDataMap,
} from "../utils/summaryStorage";
import { transformSummaries } from "../utils/transformData";

type LoadingEvent = { scope: string; sourceId?: string; status: boolean };
type SummaryUpdatedEvent = { sourceId: string; content: string };
type EventData = LoadingEvent | SummaryUpdatedEvent | undefined;

type Listener = (data?: EventData) => void;

export class SummaryService {
  private driver: IBrowserDriver;
  private listeners: Record<string, Listener[]> = {};
  public summarys: SourceDataMap = {};
  private tab: NotebookLMTab | null = null;

  constructor(driver: IBrowserDriver) {
    this.driver = driver;
    this.loadSummaries();
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

  private async loadSummaries(): Promise<void> {
    this.summarys = await getSummaries();
  }

  public async syncSummaries(notebooks: Notebook[], tab: NotebookLMTab): Promise<void> {
    this.tab = tab;
    await this.deleteRemoved(notebooks);
    await this.addNewSummaries(notebooks, 5);
  }

  private async deleteRemoved(notebooks: Notebook[]): Promise<void> {
    const deletedIds = await deleteRemovedSummary(notebooks);
    if (deletedIds.length > 0) {
      deletedIds.forEach((id) => {
        delete this.summarys[id];
      });
    }
  }

  private async addNewSummaries(nbs: Notebook[], batchSize: number = 5): Promise<void> {
    const sourcesToFetch: { notebookId: string; source: Source }[] = [];

    for (const nb of nbs) {
      for (const source of nb.sources) {
        if (!this.summarys[source.id] && source.status === SourceStatus.Success) {
          sourcesToFetch.push({ notebookId: nb.id, source });
        }
      }
    }

    if (sourcesToFetch.length === 0) {
      return;
    }

    for (let i = 0; i < sourcesToFetch.length; i += batchSize) {
      const batch = sourcesToFetch.slice(i, i + batchSize);
      const sourceIdsInBatch = batch.map((item) => item.source.id);

      sourceIdsInBatch.forEach((sourceId) => this.emit("loading", { scope: "detail", sourceId, status: true }));

      try {
        const response = await this.driver.fetchSummary(this.tab!, sourceIdsInBatch);

        if (response && response !== "null") {
          const summaries = transformSummaries(response);
          for (let j = 0; j < summaries.length; j++) {
            const summary = summaries[j];
            const { notebookId, source } = batch[j];

            if (summary) {
              const content = JSON.stringify(summary);
              this.summarys[source.id] = { content };
              await addSummary(notebookId, source.id, content);
              this.emit("summaryUpdated", { sourceId: source.id, content });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch or process summaries for batch", sourceIdsInBatch, error);
      } finally {
        sourceIdsInBatch.forEach((sourceId) => this.emit("loading", { scope: "detail", sourceId, status: false }));
      }
    }
  }

  public async deleteAll(): Promise<void> {
    await deleteAllSummaries();
    this.summarys = {};
  }

  public async deleteOne(notebookId: string, sourceId: string): Promise<void> {
    await deleteSummary(notebookId, sourceId);
    delete this.summarys[sourceId];
  }
}
