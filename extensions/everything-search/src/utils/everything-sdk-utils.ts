import { ErrorCode, SortType } from "../lib/everything-constants";

/** Get a human-readable error message from an Everything error code. */
export function getErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case ErrorCode.OK:
      return "The operation completed successfully.";
    case ErrorCode.MEMORY:
      return "Failed to allocate memory for the search query.";
    case ErrorCode.IPC:
      return "Everything is not running.";
    case ErrorCode.REGISTERCLASSEX:
      return "Failed to register the search query window class.";
    case ErrorCode.CREATEWINDOW:
      return "Failed to create the search query window.";
    case ErrorCode.CREATETHREAD:
      return "Failed to create the search query thread.";
    case ErrorCode.INVALIDINDEX:
      return "Invalid index. The index must be >= 0 and < the number of visible results.";
    case ErrorCode.INVALIDCALL:
      return "Invalid call.";
    case ErrorCode.INVALIDREQUEST:
      return "Invalid request data, request data first.";
    case ErrorCode.INVALIDPARAMETER:
      return "Bad parameter.";
    default:
      return `Unknown error code: ${errorCode}`;
  }
}

/** Map a sort preference string to an Everything SDK SortType constant. */
export function mapSortPreferenceToSDK(sortPreference: string): SortType {
  const mapping: Record<string, SortType> = {
    "-sort name-ascending": SortType.NAME_ASCENDING,
    "-sort name-descending": SortType.NAME_DESCENDING,
    "-sort path-ascending": SortType.PATH_ASCENDING,
    "-sort path-descending": SortType.PATH_DESCENDING,
    "-sort size-ascending": SortType.SIZE_ASCENDING,
    "-sort size-descending": SortType.SIZE_DESCENDING,
    "-sort extension-ascending": SortType.EXTENSION_ASCENDING,
    "-sort extension-descending": SortType.EXTENSION_DESCENDING,
    "-sort date-created-ascending": SortType.DATE_CREATED_ASCENDING,
    "-sort date-created-descending": SortType.DATE_CREATED_DESCENDING,
    "-sort date-modified-ascending": SortType.DATE_MODIFIED_ASCENDING,
    "-sort date-modified-descending": SortType.DATE_MODIFIED_DESCENDING,
    "-sort date-accessed-ascending": SortType.DATE_ACCESSED_ASCENDING,
    "-sort date-accessed-descending": SortType.DATE_ACCESSED_DESCENDING,
    "-sort attributes-ascending": SortType.ATTRIBUTES_ASCENDING,
    "-sort attributes-descending": SortType.ATTRIBUTES_DESCENDING,
    "-sort file-list-file-name-ascending": SortType.FILE_LIST_FILENAME_ASCENDING,
    "-sort file-list-file-name-descending": SortType.FILE_LIST_FILENAME_DESCENDING,
    "-sort run-count-ascending": SortType.RUN_COUNT_ASCENDING,
    "-sort run-count-descending": SortType.RUN_COUNT_DESCENDING,
    "-sort date-recently-changed-ascending": SortType.DATE_RECENTLY_CHANGED_ASCENDING,
    "-sort date-recently-changed-descending": SortType.DATE_RECENTLY_CHANGED_DESCENDING,
    "-sort date-run-ascending": SortType.DATE_RUN_ASCENDING,
    "-sort date-run-descending": SortType.DATE_RUN_DESCENDING,
  };
  return mapping[sortPreference] ?? SortType.NAME_ASCENDING;
}
