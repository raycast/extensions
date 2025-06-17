import { ArcBrowserDriver, IBrowserDriver } from "../drivers";
import { NotebookService } from "./NotebookService";
import { SummaryService } from "./SummaryService";
import { Browser, BrowserList } from "../types";

let driverInstance: IBrowserDriver | null = null;
let notebookServiceInstance: NotebookService | null = null;
let summaryServiceInstance: SummaryService | null = null;

const BrowserDriverList = {
  Arc: ArcBrowserDriver,
};

function getDriver(): IBrowserDriver {
  if (driverInstance) {
    return driverInstance;
  }
  if (BrowserList[Browser] && BrowserDriverList[Browser]) {
    driverInstance = new BrowserDriverList[Browser]();
  } else {
    driverInstance = new ArcBrowserDriver();
  }
  return driverInstance;
}

export function getNotebookService(): NotebookService {
  if (notebookServiceInstance) {
    return notebookServiceInstance;
  }

  const driver = getDriver();
  const summaryService = getSummaryService();
  notebookServiceInstance = new NotebookService(driver, summaryService);
  return notebookServiceInstance;
}

export function getSummaryService(): SummaryService {
  if (summaryServiceInstance) {
    return summaryServiceInstance;
  }

  const driver = getDriver();
  summaryServiceInstance = new SummaryService(driver);
  return summaryServiceInstance;
}
