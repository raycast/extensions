//! Minimal read-only SQLite access for the databases browsers keep on disk.
//!
//! SQLite is reached through `winsqlite3.dll`, which ships with Windows, so nothing extra
//! is bundled or downloaded. A browser holds a write lock on these files while it runs, so
//! they are always queried on a copy.

use std::ffi::{c_char, c_int, c_void, CString};
use windows::core::{s, PCSTR};
use windows::Win32::Foundation::HMODULE;
use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};

const SQLITE_OPEN_READONLY: c_int = 1;
const SQLITE_ROW: c_int = 100;

type OpenV2 = unsafe extern "C" fn(*const c_char, *mut *mut c_void, c_int, *const c_char) -> c_int;
type PrepareV2 =
    unsafe extern "C" fn(*mut c_void, *const c_char, c_int, *mut *mut c_void, *mut *const c_char) -> c_int;
type Step = unsafe extern "C" fn(*mut c_void) -> c_int;
type ColumnText = unsafe extern "C" fn(*mut c_void, c_int) -> *const u8;
type ColumnBlob = unsafe extern "C" fn(*mut c_void, c_int) -> *const u8;
type ColumnBytes = unsafe extern "C" fn(*mut c_void, c_int) -> c_int;
type ColumnInt = unsafe extern "C" fn(*mut c_void, c_int) -> c_int;
type Finalize = unsafe extern "C" fn(*mut c_void) -> c_int;
type CloseV2 = unsafe extern "C" fn(*mut c_void) -> c_int;

pub struct Sqlite {
    open_v2: OpenV2,
    prepare_v2: PrepareV2,
    step: Step,
    column_text: ColumnText,
    column_blob: ColumnBlob,
    column_bytes: ColumnBytes,
    column_int: ColumnInt,
    finalize: Finalize,
    close_v2: CloseV2,
}

/// One row of a query, borrowed for the duration of the callback.
pub struct Row<'a> {
    sqlite: &'a Sqlite,
    statement: *mut c_void,
}

impl Row<'_> {
    pub fn text(&self, column: i32) -> Option<String> {
        unsafe {
            let pointer = (self.sqlite.column_text)(self.statement, column);
            if pointer.is_null() {
                return None;
            }
            let length = (self.sqlite.column_bytes)(self.statement, column) as usize;
            (length > 0)
                .then(|| String::from_utf8_lossy(std::slice::from_raw_parts(pointer, length)).into_owned())
        }
    }

    pub fn blob(&self, column: i32) -> Option<Vec<u8>> {
        unsafe {
            let pointer = (self.sqlite.column_blob)(self.statement, column);
            if pointer.is_null() {
                return None;
            }
            let length = (self.sqlite.column_bytes)(self.statement, column) as usize;
            (length > 0).then(|| std::slice::from_raw_parts(pointer, length).to_vec())
        }
    }

    pub fn int(&self, column: i32) -> i32 {
        unsafe { (self.sqlite.column_int)(self.statement, column) }
    }
}

impl Sqlite {
    pub fn load() -> Option<Self> {
        unsafe {
            let module: HMODULE = LoadLibraryW(windows::core::w!("winsqlite3.dll")).ok()?;
            Some(Self {
                open_v2: export(module, s!("sqlite3_open_v2"))?,
                prepare_v2: export(module, s!("sqlite3_prepare_v2"))?,
                step: export(module, s!("sqlite3_step"))?,
                column_text: export(module, s!("sqlite3_column_text"))?,
                column_blob: export(module, s!("sqlite3_column_blob"))?,
                column_bytes: export(module, s!("sqlite3_column_bytes"))?,
                column_int: export(module, s!("sqlite3_column_int"))?,
                finalize: export(module, s!("sqlite3_finalize"))?,
                close_v2: export(module, s!("sqlite3_close_v2"))?,
            })
        }
    }

    /// Runs a query against a copy of `path`, handing every row to `visit`.
    pub fn query(&self, path: &std::path::Path, sql: &str, mut visit: impl FnMut(Row)) {
        let copy = copy_for_reading(path);
        let Some(copy) = copy else {
            return;
        };
        let (Ok(file), Ok(query)) = (
            CString::new(copy.to_string_lossy().as_bytes()),
            CString::new(sql),
        ) else {
            let _ = std::fs::remove_file(&copy);
            return;
        };

        unsafe {
            let mut db: *mut c_void = std::ptr::null_mut();
            if (self.open_v2)(file.as_ptr(), &mut db, SQLITE_OPEN_READONLY, std::ptr::null()) == 0 {
                let mut statement: *mut c_void = std::ptr::null_mut();
                if (self.prepare_v2)(db, query.as_ptr(), -1, &mut statement, std::ptr::null_mut()) == 0 {
                    while (self.step)(statement) == SQLITE_ROW {
                        visit(Row {
                            sqlite: self,
                            statement,
                        });
                    }
                    (self.finalize)(statement);
                }
            }
            (self.close_v2)(db);
        }
        // no reason to leave a copy of someone's browsing data lying around
        let _ = std::fs::remove_file(&copy);
    }
}

/// Looks up an export and reinterprets it as the matching function pointer.
unsafe fn export<T>(module: HMODULE, name: PCSTR) -> Option<T> {
    unsafe {
        let address = GetProcAddress(module, name)?;
        Some(std::mem::transmute_copy(&address))
    }
}

fn copy_for_reading(path: &std::path::Path) -> Option<std::path::PathBuf> {
    let name = format!(
        "raycast-browser-tabs-{:x}.db",
        path.to_string_lossy().bytes().fold(0u64, |hash, byte| {
            hash.wrapping_mul(31).wrapping_add(byte as u64)
        })
    );
    let copy = std::env::temp_dir().join(name);
    std::fs::copy(path, &copy).ok().map(|_| copy)
}
