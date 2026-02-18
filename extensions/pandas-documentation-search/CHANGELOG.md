# Pandas Documentation Search Changelog

## [1.0.4] - 2026-02-18

- Fixed object method signatures to use object-style names (for example, `df.head(...)`) instead of fully-qualified `pd.*` forms.

## [1.0.3] - {PR_MERGE_DATE}

- Kept constructor/class references such as `pd.DataFrame`, `pd.Series`, and `pd.Array` unshortened when aliases are enabled.

## [1.0.2] - {PR_MERGE_DATE}

- Expanded the alias option to also map common names (for example, `DataFrame`->`df`, `Series`->`s`, and `array(s)`->`arr`) together with `pandas`->`pd`.

## [1.0.1] - {PR_MERGE_DATE}

- Added a `Hide API Items` preference (enabled by default) to exclude symbols whose path starts with `api`.

## [1.0.0] - {PR_MERGE_DATE}

- Added a full in-extension Pandas API docs search and detail viewer backed by the official `objects.inv`.
- Added symbol ranking, in-panel detail preview, full-screen detail view, and quick actions for URL/name/signature copy.
- Added a user preference to display symbols with `pd.` prefix instead of `pandas.`.
