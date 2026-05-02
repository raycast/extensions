//! Canonical contract, shared types, and helpers for the `ray-fb` CLI.
//!
//! This module is THE single source of truth for:
//! - CLI command definitions and their argument shapes
//! - Sort modes and item types
//! - Exit-code policy
//! - Shared value types (tags, etc.)
//! - Path validation helpers

pub mod contract;
pub mod error;
pub mod finder_tags;
pub mod path;
pub mod types;
