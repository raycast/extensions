//! Unified CLI entrypoint for `ray-fb`.
//!
//! Routes all operations through explicit item-oriented subcommands using a
//! typed clap CLI parser.

use clap::{Parser, Subcommand};
use file_browser_native::core::contract::SortMode;
use file_browser_native::core::error::{RayFbError, EXIT_SUCCESS, EXIT_USAGE};
use file_browser_native::core::types::{write_json, write_plain};
use file_browser_native::domain::read::{generate_thumbnail, hydrate_items, read_dir_items, read_items_by_tag, ReadDirOptions, spotlight_search};
use file_browser_native::domain::write::comment::set_finder_comment;
use file_browser_native::domain::write::copy::copy_item;
use file_browser_native::domain::write::create::create_folder;
use file_browser_native::domain::write::move_item::move_item;
use file_browser_native::domain::write::flags::{is_locked, set_locked_flag};
use file_browser_native::domain::write::rename::rename_item;
use file_browser_native::domain::write::stationery::set_stationery_pad;
use file_browser_native::domain::write::tags::{list_finder_tags, set_finder_tags};
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemsSearchResult {
    pub paths: Vec<String>,
    pub is_truncated: bool,
    pub is_timed_out: bool,
}

// ---------------------------------------------------------------------------
// CLI definitions
// ---------------------------------------------------------------------------

#[derive(Parser)]
#[command(name = "ray-fb", version, about = "File browser native CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Operations on collections of items
    Items {
        #[command(subcommand)]
        action: ItemsAction,
    },
    /// Operations on a single item
    Item {
        #[command(subcommand)]
        action: ItemAction,
    },
    /// Operations on tags
    Tags {
        #[command(subcommand)]
        action: TagsAction,
    },
}

#[derive(Subcommand)]
enum ItemsAction {
    /// List items in a directory
    List {
        /// Directory path to list
        #[arg(long)]
        path: String,
        /// Sort mode (e.g. name-asc, kind-asc, added-desc, modified-asc)
        #[arg(long, default_value = "name-asc")]
        sort: String,
        /// Whether to show hidden files ("true" or "false")
        #[arg(long, default_value = "true")]
        show_hidden: String,
    },
    /// List items by Finder tag
    ByTag {
        /// Tag name to search for
        #[arg(long)]
        name: String,
        /// Sort mode (e.g. name-asc, kind-asc, added-desc, modified-asc)
        #[arg(long, default_value = "name-asc")]
        sort: String,
        /// Whether to show hidden files ("true" or "false")
        #[arg(long, default_value = "true")]
        show_hidden: String,
    },
    /// Search for items using Spotlight predicate
    Search {
        /// Directory path to search within
        #[arg(long)]
        only_in: String,
        /// Spotlight predicate string
        #[arg(long)]
        predicate: String,
        /// Maximum number of results to return
        #[arg(long)]
        max_results: Option<usize>,
        /// Timeout in milliseconds
        #[arg(long)]
        timeout_ms: Option<u64>,
    },
    /// Hydrate a list of paths into full Item objects
    Hydrate {
        /// Paths to hydrate
        #[arg(long, num_args = 1..)]
        paths: Vec<String>,
        /// Whether to show hidden files ("true" or "false")
        #[arg(long, default_value = "true")]
        show_hidden: String,
    },
}

#[derive(Subcommand)]
enum ItemAction {
    /// Copy an item to a destination directory
    Copy {
        /// Source path
        #[arg(long)]
        path: String,
        /// Destination directory
        #[arg(long)]
        to: String,
    },
    /// Create a new folder
    Create {
        /// Parent directory path
        #[arg(long)]
        path: String,
        /// Name for the new folder
        #[arg(long)]
        name: String,
    },
    /// Rename an item
    Rename {
        /// Source path
        #[arg(long)]
        path: String,
        /// New name for the item
        #[arg(long = "to")]
        new_name: String,
    },
    /// Manage Finder comment
    Comment {
        #[command(subcommand)]
        action: CommentAction,
    },
    /// Manage locked flag
    Locked {
        #[command(subcommand)]
        action: LockedAction,
    },
    /// Move an item to a destination directory
    Move {
        /// Source path
        #[arg(long)]
        path: String,
        /// Destination directory
        #[arg(long)]
        to: String,
    },
    /// Manage stationery pad flag
    Stationery {
        #[command(subcommand)]
        action: StationeryAction,
    },
    /// Manage Finder tags
    Tags {
        #[command(subcommand)]
        action: ItemTagsAction,
    },
    /// Generate a thumbnail for a file
    Thumbnail {
        /// File path
        #[arg(long)]
        path: String,
        /// Maximum thumbnail size in pixels
        #[arg(long, default_value = "512")]
        size: u32,
    },
}

#[derive(Subcommand)]
enum CommentAction {
    /// Set the Finder comment
    Set {
        #[arg(long)]
        path: String,
        #[arg(long)]
        value: String,
    },
}

#[derive(Subcommand)]
enum LockedAction {
    /// Get the locked status
    Get {
        #[arg(long)]
        path: String,
    },
    /// Set the locked status
    Set {
        #[arg(long)]
        path: String,
        /// "true" or "false"
        #[arg(long)]
        value: String,
    },
}

#[derive(Subcommand)]
enum StationeryAction {
    /// Set the stationery pad flag
    Set {
        #[arg(long)]
        path: String,
        /// "true" or "false"
        #[arg(long)]
        value: String,
    },
}

#[derive(Subcommand)]
enum ItemTagsAction {
    /// Replace all tags on an item
    Replace {
        #[arg(long)]
        path: String,
        /// Tag names
        #[arg(long, num_args = 0..)]
        values: Vec<String>,
    },
}

#[derive(Subcommand)]
enum TagsAction {
    /// List all known Finder tags
    List,
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

fn main() -> ! {
    let cli = match Cli::try_parse() {
        Ok(cli) => cli,
        Err(err) => {
            err.print().ok();
            std::process::exit(EXIT_USAGE);
        }
    };

    let result = dispatch(cli);
    let exit_code = match result {
        Ok(()) => EXIT_SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            e.exit_code()
        }
    };
    std::process::exit(exit_code);
}

fn dispatch(cli: Cli) -> Result<(), RayFbError> {
    match cli.command {
        Commands::Items { action } => dispatch_items(action),
        Commands::Item { action } => dispatch_item(action),
        Commands::Tags { action } => dispatch_tags(action),
    }
}

// ---------------------------------------------------------------------------
// Dispatchers
// ---------------------------------------------------------------------------

fn dispatch_items(action: ItemsAction) -> Result<(), RayFbError> {
    match action {
        ItemsAction::List { path, sort, show_hidden } => {
            let sort_mode = SortMode::from_str(&sort).ok_or_else(|| {
                RayFbError::Usage(format!("unknown sort mode: {sort}"))
            })?;

            let show_hidden_bool = parse_bool_flag(&show_hidden, "show-hidden")?;
            let options = ReadDirOptions {
                skip_dotfiles: !show_hidden_bool,
                sort_directories_first: true,
                sort_mode,
            };

            let dir = Path::new(&path);
            if !dir.exists() {
                return Err(RayFbError::NotFound {
                    path: Some(dir.to_path_buf()),
                    detail: "directory not found".into(),
                });
            }
            if !dir.is_dir() {
                return Err(RayFbError::Usage(format!("not a directory: {path}")));
            }

            let items = read_dir_items(dir, &options).map_err(map_boxed_error)?;
            write_json(&items).map_err(|e| RayFbError::Internal {
                source: e.into(),
                detail: None,
            })
        }
        ItemsAction::ByTag { name, sort, show_hidden } => {
            let sort_mode = SortMode::from_str(&sort).ok_or_else(|| {
                RayFbError::Usage(format!("unknown sort mode: {sort}"))
            })?;

            let show_hidden_bool = parse_bool_flag(&show_hidden, "show-hidden")?;
            let options = ReadDirOptions {
                skip_dotfiles: !show_hidden_bool,
                sort_directories_first: true,
                sort_mode,
            };

            let items = read_items_by_tag(&name, &options).map_err(map_boxed_error)?;
            write_json(&items).map_err(|e| RayFbError::Internal {
                source: e.into(),
                detail: None,
            })
        }
        ItemsAction::Search { only_in, predicate, max_results, timeout_ms } => {
            let scope = Path::new(&only_in);
            if !scope.exists() {
                return Err(RayFbError::NotFound {
                    path: Some(scope.to_path_buf()),
                    detail: "search scope directory not found".into(),
                });
            }
            if !scope.is_dir() {
                return Err(RayFbError::Usage(format!("--only-in must be a directory: {only_in}")));
            }

            let result = spotlight_search(scope, &predicate, max_results, timeout_ms)?;

            let (paths, is_truncated, is_timed_out) = result;
            let search_result = ItemsSearchResult { paths, is_truncated, is_timed_out };
            write_json(&search_result).map_err(|e| RayFbError::Internal {
                source: e.into(),
                detail: None,
            })
        	}
        ItemsAction::Hydrate { paths, show_hidden } => {
            let show_hidden_bool = parse_bool_flag(&show_hidden, "show-hidden")?;
            let paths_buf: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();
            let items = hydrate_items(&paths_buf, !show_hidden_bool);
            write_json(&items).map_err(|e| RayFbError::Internal {
                source: e.into(),
                detail: None,
            })
        }
    }
}

fn dispatch_item(action: ItemAction) -> Result<(), RayFbError> {
    match action {
        ItemAction::Copy { path, to } => {
            let src = Path::new(&path);
            require_path(src)?;
            let dst_dir = Path::new(&to);
            let new_path = copy_item(src, dst_dir).map_err(map_boxed_error)?;
            write_plain(new_path.to_string_lossy());
            Ok(())
        }
        ItemAction::Create { path, name } => {
            let dir = Path::new(&path);
            let new_path = create_folder(dir, &name).map_err(map_boxed_error)?;
            write_plain(new_path.to_string_lossy());
            Ok(())
        }
        ItemAction::Rename { path, new_name } => {
            let p = Path::new(&path);
            require_path(p)?;
            let new_path = rename_item(p, OsStr::new(&new_name)).map_err(map_boxed_error)?;
            write_plain(new_path.to_string_lossy());
            Ok(())
        }
        ItemAction::Comment { action } => match action {
            CommentAction::Set { path, value } => {
                let p = Path::new(&path);
                require_path(p)?;
                set_finder_comment(p, &value).map_err(map_boxed_error)
            }
        },
        ItemAction::Locked { action } => match action {
            LockedAction::Get { path } => {
                let p = Path::new(&path);
                require_path(p)?;
                let locked = is_locked(p).map_err(map_boxed_error)?;
                write_plain(if locked { "true" } else { "false" });
                Ok(())
            }
            LockedAction::Set { path, value } => {
                let p = Path::new(&path);
                require_path(p)?;
                let locked = parse_bool_flag(&value, "value")?;
                set_locked_flag(p, locked).map_err(map_boxed_error)
            }
        },
        ItemAction::Move { path, to } => {
            let src = Path::new(&path);
            require_path(src)?;
            let dst_dir = Path::new(&to);
            let new_path = move_item(src, dst_dir).map_err(map_boxed_error)?;
            write_plain(new_path.to_string_lossy());
            Ok(())
        }
        ItemAction::Stationery { action } => match action {
            StationeryAction::Set { path, value } => {
                let p = Path::new(&path);
                require_path(p)?;
                let stationery = parse_bool_flag(&value, "value")?;
                set_stationery_pad(p, stationery).map_err(map_boxed_error)
            }
        },
        ItemAction::Tags { action } => match action {
            ItemTagsAction::Replace { path, values } => {
                let p = Path::new(&path);
                require_path(p)?;
                set_finder_tags(p, &values).map_err(map_boxed_error)
            }
        },
        ItemAction::Thumbnail { path, size } => {
            let p = Path::new(&path);
            require_path(p)?;
            let cache_dir = Path::new("/tmp/ray-fb-thumbnails");
            let png_path = generate_thumbnail(p, size, cache_dir)
                .map_err(|e| RayFbError::Metadata(e.to_string()))?;
            write_plain(png_path.to_string_lossy());
            Ok(())
        }
    }
}

fn dispatch_tags(action: TagsAction) -> Result<(), RayFbError> {
    match action {
        TagsAction::List => {
            let tags = list_finder_tags().map_err(map_boxed_error)?;
            write_json(&tags).map_err(|e| RayFbError::Internal {
                source: e.into(),
                detail: None,
            })
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Parse a "true"/"false" string from a CLI flag.
fn parse_bool_flag(value: &str, flag_name: &str) -> Result<bool, RayFbError> {
    match value {
        "true" => Ok(true),
        "false" => Ok(false),
        other => Err(RayFbError::Usage(format!(
            "--{flag_name} expects \"true\" or \"false\", got \"{other}\""
        ))),
    }
}

/// Ensure a path exists on disk.
fn require_path(path: &Path) -> Result<(), RayFbError> {
    if path.exists() {
        Ok(())
    } else {
        Err(RayFbError::NotFound {
            path: Some(path.to_path_buf()),
            detail: "path does not exist".into(),
        })
    }
}

/// Map a `Box<dyn Error>` from domain functions to `RayFbError`.
///
/// Domain functions currently return `Box<dyn Error>` so we inspect the
/// error string for heuristic classification. Once they migrate to
/// `RayFbError` natively this can be simplified.
fn map_boxed_error(err: Box<dyn std::error::Error>) -> RayFbError {
    let msg = err.to_string();
    if msg.contains("Permission denied")
        || msg.contains("Operation not permitted")
        || msg.contains("chflags failed")
    {
        RayFbError::Permission(msg)
    } else if msg.contains("not found") || msg.contains("does not exist") {
        RayFbError::NotFound {
            path: None,
            detail: msg,
        }
    } else if msg.starts_with("Name ") || msg.contains("already exists") {
        RayFbError::Usage(msg)
    } else {
        RayFbError::Internal {
            source: err.to_string().into(),
            detail: None,
        }
    }
}
