import { join } from "path";
import { environment } from "@raycast/api";
import { filetimeToDate, largeIntToNumber } from "./everything-constants";

// ============================================================================
// Everything SDK - DLL FFI bindings via koffi
// ============================================================================

// ---------------------------------------------------------------------------
// Native file handling
// ---------------------------------------------------------------------------
// Koffi uses native modules to work. Since they are unsupported, we need to load prebuilt modules available from NPM package.
// The prebuilt modules are moved to the assets/native folder by `npm run fetch-sdk-binaries`.
// require('koffi/indirect') will look for prebuilt modules without trying to build one locally.
// We temporarily override process.resourcesPath to point to our assets/native folder, so koffi can find the prebuilt module there.
// After loading koffi, we restore the original resourcesPath.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fn: Record<string, any> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let koffi: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dll: any = null;

let _loaded: boolean = false;

/**
 * Load the Everything SDK native library.
 * Validates that OS is Windows, loads koffi and the Everything_${arch}.dll,
 * and populates all FFI bindings. Safe to call multiple times (no-op after first success).
 * @throws {Error} if native loading fails.
 */
export function load(): void {
  if (_loaded) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedResourcesPath = (process as any).resourcesPath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).resourcesPath = join(environment.assetsPath, "native");
    koffi = require("koffi/indirect");
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).resourcesPath = savedResourcesPath;
  }

  const arch = process.arch; // "x64" or "arm64"
  dll = koffi.load(join(environment.assetsPath, "native", `Everything_${arch}.dll`));

  // ---------- Win32 type helpers ----------
  koffi.struct("FILETIME", {
    dwLowDateTime: "uint32",
    dwHighDateTime: "uint32",
  });

  koffi.struct("LARGE_INTEGER", {
    LowPart: "uint32",
    HighPart: "int32",
  });

  // ---------- Bind all Everything SDK functions ----------

  // Write search state
  fn.SetSearchW = dll.func("void   __stdcall Everything_SetSearchW(str16 lpString)");
  fn.SetMatchPath = dll.func("void   __stdcall Everything_SetMatchPath(int bEnable)");
  fn.SetMatchCase = dll.func("void   __stdcall Everything_SetMatchCase(int bEnable)");
  fn.SetMatchWholeWord = dll.func("void   __stdcall Everything_SetMatchWholeWord(int bEnable)");
  fn.SetRegex = dll.func("void   __stdcall Everything_SetRegex(int bEnable)");
  fn.SetMax = dll.func("void   __stdcall Everything_SetMax(uint32 dwMax)");
  fn.SetOffset = dll.func("void   __stdcall Everything_SetOffset(uint32 dwOffset)");
  fn.SetSort = dll.func("void   __stdcall Everything_SetSort(uint32 dwSort)");
  fn.SetRequestFlags = dll.func("void   __stdcall Everything_SetRequestFlags(uint32 dwRequestFlags)");
  fn.SetReplyID = dll.func("void   __stdcall Everything_SetReplyID(uint32 dwId)");
  fn.SetReplyWindow = dll.func("void   __stdcall Everything_SetReplyWindow(uintptr_t hWnd)");

  // Read search state
  fn.GetMatchPath = dll.func("int    __stdcall Everything_GetMatchPath()");
  fn.GetMatchCase = dll.func("int    __stdcall Everything_GetMatchCase()");
  fn.GetMatchWholeWord = dll.func("int    __stdcall Everything_GetMatchWholeWord()");
  fn.GetRegex = dll.func("int    __stdcall Everything_GetRegex()");
  fn.GetMax = dll.func("uint32 __stdcall Everything_GetMax()");
  fn.GetOffset = dll.func("uint32 __stdcall Everything_GetOffset()");
  fn.GetSearchW = dll.func("str16  __stdcall Everything_GetSearchW()");
  fn.GetLastError = dll.func("uint32 __stdcall Everything_GetLastError()");
  fn.GetSort = dll.func("uint32 __stdcall Everything_GetSort()");
  fn.GetRequestFlags = dll.func("uint32 __stdcall Everything_GetRequestFlags()");
  fn.GetReplyID = dll.func("uint32 __stdcall Everything_GetReplyID()");
  fn.GetReplyWindow = dll.func("uintptr_t __stdcall Everything_GetReplyWindow()");

  // Execute query
  fn.QueryW = dll.func("int    __stdcall Everything_QueryW(int bWait)");

  // Check if a window message is a query reply (for async IPC mode)
  fn.IsQueryReply = dll.func(
    "int __stdcall Everything_IsQueryReply(uint32 message, uintptr_t wParam, intptr_t lParam, uint32 dwId)",
  );

  // Read result state
  fn.GetNumFileResults = dll.func("uint32 __stdcall Everything_GetNumFileResults()");
  fn.GetNumFolderResults = dll.func("uint32 __stdcall Everything_GetNumFolderResults()");
  fn.GetNumResults = dll.func("uint32 __stdcall Everything_GetNumResults()");
  fn.GetTotFileResults = dll.func("uint32 __stdcall Everything_GetTotFileResults()");
  fn.GetTotFolderResults = dll.func("uint32 __stdcall Everything_GetTotFolderResults()");
  fn.GetTotResults = dll.func("uint32 __stdcall Everything_GetTotResults()");

  // Result item accessors
  fn.IsVolumeResult = dll.func("int    __stdcall Everything_IsVolumeResult(uint32 dwIndex)");
  fn.IsFolderResult = dll.func("int    __stdcall Everything_IsFolderResult(uint32 dwIndex)");
  fn.IsFileResult = dll.func("int    __stdcall Everything_IsFileResult(uint32 dwIndex)");
  fn.GetResultFileNameW = dll.func("str16 __stdcall Everything_GetResultFileNameW(uint32 dwIndex)");
  fn.GetResultPathW = dll.func("str16  __stdcall Everything_GetResultPathW(uint32 dwIndex)");
  fn.GetResultFullPathNameW = dll.func(
    "uint32 __stdcall Everything_GetResultFullPathNameW(uint32 dwIndex, _Out_ str16 wbuf, uint32 wbuf_size_in_wchars)",
  );
  fn.GetResultExtensionW = dll.func("str16  __stdcall Everything_GetResultExtensionW(uint32 dwIndex)");
  fn.GetResultSize = dll.func("int    __stdcall Everything_GetResultSize(uint32 dwIndex, _Out_ LARGE_INTEGER *lpSize)");
  fn.GetResultDateCreated = dll.func(
    "int    __stdcall Everything_GetResultDateCreated(uint32 dwIndex, _Out_ FILETIME *lpDateCreated)",
  );
  fn.GetResultDateModified = dll.func(
    "int    __stdcall Everything_GetResultDateModified(uint32 dwIndex, _Out_ FILETIME *lpDateModified)",
  );
  fn.GetResultDateAccessed = dll.func(
    "int    __stdcall Everything_GetResultDateAccessed(uint32 dwIndex, _Out_ FILETIME *lpDateAccessed)",
  );
  fn.GetResultAttributes = dll.func("uint32 __stdcall Everything_GetResultAttributes(uint32 dwIndex)");
  fn.GetResultFileListFileNameW = dll.func("str16 __stdcall Everything_GetResultFileListFileNameW(uint32 dwIndex)");
  fn.GetResultRunCount = dll.func("uint32 __stdcall Everything_GetResultRunCount(uint32 dwIndex)");
  fn.GetResultDateRun = dll.func(
    "int    __stdcall Everything_GetResultDateRun(uint32 dwIndex, _Out_ FILETIME *lpDateRun)",
  );
  fn.GetResultDateRecentlyChanged = dll.func(
    "int __stdcall Everything_GetResultDateRecentlyChanged(uint32 dwIndex, _Out_ FILETIME *lpDateRecentlyChanged)",
  );
  fn.GetResultHighlightedFileNameW = dll.func(
    "str16 __stdcall Everything_GetResultHighlightedFileNameW(uint32 dwIndex)",
  );
  fn.GetResultHighlightedPathW = dll.func("str16 __stdcall Everything_GetResultHighlightedPathW(uint32 dwIndex)");
  fn.GetResultHighlightedFullPathAndFileNameW = dll.func(
    "str16 __stdcall Everything_GetResultHighlightedFullPathAndFileNameW(uint32 dwIndex)",
  );
  fn.GetResultListSort = dll.func("uint32 __stdcall Everything_GetResultListSort()");
  fn.GetResultListRequestFlags = dll.func("uint32 __stdcall Everything_GetResultListRequestFlags()");

  // Sort / reset / cleanup
  fn.SortResultsByPath = dll.func("void __stdcall Everything_SortResultsByPath()");
  fn.Reset = dll.func("void __stdcall Everything_Reset()");
  fn.CleanUp = dll.func("void __stdcall Everything_CleanUp()");

  // Version / system
  fn.GetMajorVersion = dll.func("uint32 __stdcall Everything_GetMajorVersion()");
  fn.GetMinorVersion = dll.func("uint32 __stdcall Everything_GetMinorVersion()");
  fn.GetRevision = dll.func("uint32 __stdcall Everything_GetRevision()");
  fn.GetBuildNumber = dll.func("uint32 __stdcall Everything_GetBuildNumber()");
  fn.Exit = dll.func("int    __stdcall Everything_Exit()");
  fn.IsDBLoaded = dll.func("int    __stdcall Everything_IsDBLoaded()");
  fn.IsAdmin = dll.func("int    __stdcall Everything_IsAdmin()");
  fn.IsAppData = dll.func("int    __stdcall Everything_IsAppData()");
  fn.RebuildDB = dll.func("int    __stdcall Everything_RebuildDB()");
  fn.UpdateAllFolderIndexes = dll.func("int    __stdcall Everything_UpdateAllFolderIndexes()");
  fn.SaveDB = dll.func("int    __stdcall Everything_SaveDB()");
  fn.SaveRunHistory = dll.func("int    __stdcall Everything_SaveRunHistory()");
  fn.DeleteRunHistory = dll.func("int    __stdcall Everything_DeleteRunHistory()");
  fn.GetTargetMachine = dll.func("uint32 __stdcall Everything_GetTargetMachine()");
  fn.IsFastSort = dll.func("int    __stdcall Everything_IsFastSort(uint32 sortType)");
  fn.IsFileInfoIndexed = dll.func("int    __stdcall Everything_IsFileInfoIndexed(uint32 fileInfoType)");

  // Run count
  fn.GetRunCountFromFileNameW = dll.func("uint32 __stdcall Everything_GetRunCountFromFileNameW(str16 lpFileName)");
  fn.SetRunCountFromFileNameW = dll.func(
    "int    __stdcall Everything_SetRunCountFromFileNameW(str16 lpFileName, uint32 dwRunCount)",
  );
  fn.IncRunCountFromFileNameW = dll.func("uint32 __stdcall Everything_IncRunCountFromFileNameW(str16 lpFileName)");

  _loaded = true;
}

// Reusable out-param structs to avoid repeated allocation
const _ftOut = { dwLowDateTime: 0, dwHighDateTime: 0 };
const _liOut = { LowPart: 0, HighPart: 0 };

// Buffer for GetResultFullPathNameW
const FULLPATH_BUF_SIZE = 4096;
const _fullPathBuf = Buffer.alloc(FULLPATH_BUF_SIZE * 2); // UTF-16

// ============================================================================
// Cleanup – release native handles and resources when process exits
// ============================================================================

let _disposed = false;

/**
 * Release the Everything DLL handle and free SDK-internal resources.
 */
export function dispose(): void {
  if (_disposed || !_loaded) return;
  try {
    fn.CleanUp();
  } catch {
    /* ignore */
  }
  try {
    dll.unload();
  } catch {
    /* ignore */
  }
  _disposed = true;
}

process.on("exit", dispose);

// ============================================================================
// JS API (thin wrappers that convert types to/from JS-friendly values)
// ============================================================================

// --- Write search state ---
export function setSearch(str: string) {
  fn.SetSearchW(String(str));
}
export function setMatchPath(enable: boolean) {
  fn.SetMatchPath(enable ? 1 : 0);
}
export function setMatchCase(enable: boolean) {
  fn.SetMatchCase(enable ? 1 : 0);
}
export function setMatchWholeWord(enable: boolean) {
  fn.SetMatchWholeWord(enable ? 1 : 0);
}
export function setRegex(enable: boolean) {
  fn.SetRegex(enable ? 1 : 0);
}
export function setMax(max: number) {
  fn.SetMax(max >>> 0);
}
export function setOffset(offset: number) {
  fn.SetOffset(offset >>> 0);
}
export function setSort(sort: number) {
  fn.SetSort(sort >>> 0);
}
export function setRequestFlags(flags: number) {
  fn.SetRequestFlags(flags >>> 0);
}
export function setReplyID(id: number) {
  fn.SetReplyID(id >>> 0);
}
export function setReplyWindow(hwnd: number) {
  fn.SetReplyWindow(hwnd);
}

// --- Read search state ---
export function getSearch(): string {
  return fn.GetSearchW() ?? "";
}
export function getMatchPath(): boolean {
  return !!fn.GetMatchPath();
}
export function getMatchCase(): boolean {
  return !!fn.GetMatchCase();
}
export function getMatchWholeWord(): boolean {
  return !!fn.GetMatchWholeWord();
}
export function getRegex(): boolean {
  return !!fn.GetRegex();
}
export function getMax(): number {
  return fn.GetMax();
}
export function getOffset(): number {
  return fn.GetOffset();
}
export function getSort(): number {
  return fn.GetSort();
}
export function getRequestFlags(): number {
  return fn.GetRequestFlags();
}
export function getReplyID(): number {
  return fn.GetReplyID();
}
export function getReplyWindow(): number {
  return fn.GetReplyWindow();
}
export function getLastError(): number {
  return fn.GetLastError();
}

// --- Query (async via koffi .async(), runs on worker thread) ---
export function query(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fn.QueryW.async(1, (err: Error | null, result: number) => {
      if (err) return reject(err);
      resolve(!!result);
    });
  });
}
export function isQueryReply(message: number, wParam: number, lParam: number, id: number): boolean {
  return !!fn.IsQueryReply(message >>> 0, wParam, lParam, id >>> 0);
}

// --- Result counts ---
export function getNumResults(): number {
  return fn.GetNumResults();
}
export function getNumFileResults(): number {
  return fn.GetNumFileResults();
}
export function getNumFolderResults(): number {
  return fn.GetNumFolderResults();
}
export function getTotResults(): number {
  return fn.GetTotResults();
}
export function getTotFileResults(): number {
  return fn.GetTotFileResults();
}
export function getTotFolderResults(): number {
  return fn.GetTotFolderResults();
}
export function getResultListSort(): number {
  return fn.GetResultListSort();
}
export function getResultListRequestFlags(): number {
  return fn.GetResultListRequestFlags();
}

// --- Result item accessors ---
export function isVolumeResult(i: number): boolean {
  return !!fn.IsVolumeResult(i >>> 0);
}
export function isFolderResult(i: number): boolean {
  return !!fn.IsFolderResult(i >>> 0);
}
export function isFileResult(i: number): boolean {
  return !!fn.IsFileResult(i >>> 0);
}
export function getResultFileName(i: number): string | null {
  return fn.GetResultFileNameW(i >>> 0) ?? null;
}
export function getResultPath(i: number): string | null {
  return fn.GetResultPathW(i >>> 0) ?? null;
}

export function getResultFullPathName(i: number): string {
  const len = fn.GetResultFullPathNameW(i >>> 0, _fullPathBuf, FULLPATH_BUF_SIZE);
  if (len === 0) return "";
  return _fullPathBuf.toString("utf16le", 0, len * 2);
}

export function getResultExtension(i: number): string | null {
  return fn.GetResultExtensionW(i >>> 0) ?? null;
}

export function getResultSize(i: number): number | null {
  _liOut.LowPart = 0;
  _liOut.HighPart = 0;
  if (!fn.GetResultSize(i >>> 0, _liOut)) return null;
  return largeIntToNumber(_liOut);
}

export function getResultDateCreated(i: number): Date | null {
  _ftOut.dwLowDateTime = 0;
  _ftOut.dwHighDateTime = 0;
  if (!fn.GetResultDateCreated(i >>> 0, _ftOut)) return null;
  return filetimeToDate(_ftOut);
}

export function getResultDateModified(i: number): Date | null {
  _ftOut.dwLowDateTime = 0;
  _ftOut.dwHighDateTime = 0;
  if (!fn.GetResultDateModified(i >>> 0, _ftOut)) return null;
  return filetimeToDate(_ftOut);
}

export function getResultDateAccessed(i: number): Date | null {
  _ftOut.dwLowDateTime = 0;
  _ftOut.dwHighDateTime = 0;
  if (!fn.GetResultDateAccessed(i >>> 0, _ftOut)) return null;
  return filetimeToDate(_ftOut);
}

export function getResultAttributes(i: number): number {
  return fn.GetResultAttributes(i >>> 0);
}
export function getResultFileListFileName(i: number): string | null {
  return fn.GetResultFileListFileNameW(i >>> 0) ?? null;
}
export function getResultRunCount(i: number): number {
  return fn.GetResultRunCount(i >>> 0);
}

export function getResultDateRun(i: number): Date | null {
  _ftOut.dwLowDateTime = 0;
  _ftOut.dwHighDateTime = 0;
  if (!fn.GetResultDateRun(i >>> 0, _ftOut)) return null;
  return filetimeToDate(_ftOut);
}

export function getResultDateRecentlyChanged(i: number): Date | null {
  _ftOut.dwLowDateTime = 0;
  _ftOut.dwHighDateTime = 0;
  if (!fn.GetResultDateRecentlyChanged(i >>> 0, _ftOut)) return null;
  return filetimeToDate(_ftOut);
}

export function getResultHighlightedFileName(i: number): string | null {
  return fn.GetResultHighlightedFileNameW(i >>> 0) ?? null;
}
export function getResultHighlightedPath(i: number): string | null {
  return fn.GetResultHighlightedPathW(i >>> 0) ?? null;
}
export function getResultHighlightedFullPathAndFileName(i: number): string | null {
  return fn.GetResultHighlightedFullPathAndFileNameW(i >>> 0) ?? null;
}

// --- Sort / reset / cleanup ---
export function sortResultsByPath(): void {
  fn.SortResultsByPath();
}
export function reset(): void {
  fn.Reset();
}
export function cleanUp(): void {
  fn.CleanUp();
}

// --- Version / system ---
export function getMajorVersion(): number {
  return fn.GetMajorVersion();
}
export function getMinorVersion(): number {
  return fn.GetMinorVersion();
}
export function getRevision(): number {
  return fn.GetRevision();
}
export function getBuildNumber(): number {
  return fn.GetBuildNumber();
}
export function exit(): boolean {
  return !!fn.Exit();
}
export function isDBLoaded(): boolean {
  return !!fn.IsDBLoaded();
}
export function isAdmin(): boolean {
  return !!fn.IsAdmin();
}
export function isAppData(): boolean {
  return !!fn.IsAppData();
}
export function rebuildDB(): boolean {
  return !!fn.RebuildDB();
}
export function updateAllFolderIndexes(): boolean {
  return !!fn.UpdateAllFolderIndexes();
}
export function saveDB(): boolean {
  return !!fn.SaveDB();
}
export function saveRunHistory(): boolean {
  return !!fn.SaveRunHistory();
}
export function deleteRunHistory(): boolean {
  return !!fn.DeleteRunHistory();
}
export function getTargetMachine(): number {
  return fn.GetTargetMachine();
}
export function isFastSort(sortType: number): boolean {
  return !!fn.IsFastSort(sortType >>> 0);
}
export function isFileInfoIndexed(type: number): boolean {
  return !!fn.IsFileInfoIndexed(type >>> 0);
}

// --- Run count ---
export function getRunCountFromFileName(f: string): number {
  return fn.GetRunCountFromFileNameW(String(f));
}
export function setRunCountFromFileName(f: string, c: number): boolean {
  return !!fn.SetRunCountFromFileNameW(String(f), c >>> 0);
}
export function incRunCountFromFileName(f: string): number {
  return fn.IncRunCountFromFileNameW(String(f));
}
