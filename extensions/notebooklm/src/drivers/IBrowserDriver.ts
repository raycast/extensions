import { NotebookLMTab, Tokens, TabInfo, TabList } from "../types";

export interface IBrowserDriver {
  openTab(): Promise<NotebookLMTab | null>;
  extractTokens(tab: NotebookLMTab): Promise<Tokens | null>;
  closeTab(tab: NotebookLMTab): Promise<void>;
  selectTab(tab: NotebookLMTab, activate: boolean): Promise<void>;
  checkLogin(tab: NotebookLMTab): Promise<boolean>;
  detectLogin(tab: NotebookLMTab, timeout: number): Promise<boolean>;
  fetchData(tab: NotebookLMTab): Promise<string>;
  createNewNotebook(tab: NotebookLMTab): Promise<string>;
  deleteNotebook(tab: NotebookLMTab, notebookIds: string[]): Promise<void>;
  deleteNotOwnedNotebook(tab: NotebookLMTab, notebookIds: string[]): Promise<void>;
  deleteSource(tab: NotebookLMTab, sourceIds: string[]): Promise<void>;
  editNotebookTitle(tab: NotebookLMTab, notebookId: string, title: string): Promise<void>;
  editSourceTitle(tab: NotebookLMTab, sourceId: string, title: string): Promise<void>;
  uploadTabs(tab: NotebookLMTab, tabList: TabInfo[], notebookId: string): Promise<void>;
  uploadPasteText(tab: NotebookLMTab, notebookId: string, text: string): Promise<string>;
  fetchSummary(tab: NotebookLMTab, sourceIds: string[]): Promise<string>;
  getTabList(): Promise<TabList>;
}
