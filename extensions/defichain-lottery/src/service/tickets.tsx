import { getAddressResult } from "../api";
import { loadAddresses } from "./addresses";
import { drawingResult, ticket } from "../types/winner_result";

export async function userTickets(): Promise<drawingResult[]> {
  const promises: Array<Promise<drawingResult>> = [];
  return new Promise((resolve) => {
    loadAddresses().then((addresses) => {
      addresses.map((address: string) => {
        const addressResult = getAddressResult.loadData(address);
        promises.push(addressResult);
      });
      Promise.all(promises).then((requests) => {
        requests.map((request) => {
          if (request !== null) {
            addToResult(request);
          }
        });
        sortTickets();
        sortDrawing();
        resolve(result);
      });
    });
  });
}

let result: Array<drawingResult> = [];
function addToResult(data: any) {
  // first element can be added
  if (result.length == 0) {
    result = data;
    return;
  }

  data.map((dataItem: any) => {
    // if element not exist add it
    if (!drawingExist(dataItem)) {
      result = [...result, dataItem];
      return;
    }

    mergeResults(dataItem);
  });
}

function drawingExist(data: any): boolean {
  return result.some((item) => {
    if (item.meta.identifier == data.meta.identifier) {
      return true;
    }
    return false;
  });
}

function mergeResults(data: any): drawingResult[] {
  result.map((resultItem, index) => {
    if (resultItem.meta.identifier === data.meta.identifier) {
      const mergedResultItem = {
        meta: resultItem.meta,
        tickets: [...resultItem.tickets, ...data.tickets],
        user_payout_total: resultItem.user_payout_total + data.user_payout_total,
      };
      result[index] = mergedResultItem;
      return result;
    }
  });
  // you never should reach this state ..... oO....
  return result;
}

function sortTickets(): void {
  result.map(function (drawing: drawingResult) {
    drawing.tickets.sort(function (a: ticket, b: ticket) {
      if (a.bucket === null) a.bucket = 0;
      if (b.bucket === null) b.bucket = 0;
      return a.bucket > b.bucket ? -1 : 1;
    });
  });
}

function sortDrawing(): void {
  result.sort(function (a: drawingResult, b: drawingResult) {
    return a.meta.round_number > b.meta.round_number ? -1 : 1;
  });
}
