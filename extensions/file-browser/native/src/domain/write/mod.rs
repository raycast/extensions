//! Write/mutation domain — all operations that modify filesystem state.
//!
//! Re-exports the public API of each focused submodule so consumers can
//! `use crate::domain::write::{rename_item, ...}` directly.

pub mod applescript;
pub mod comment;
pub mod copy;
pub mod create;
pub mod flags;
pub mod move_item;
pub mod rename;
pub mod stationery;
pub mod tags;

// Convenience re-exports
pub use comment::set_finder_comment;
pub use copy::copy_item;
pub use create::create_folder;
pub use flags::{is_locked, set_locked_flag};
pub use move_item::move_item;
pub use rename::rename_item;
pub use stationery::set_stationery_pad;
pub use tags::{list_finder_tags, set_finder_tags};
