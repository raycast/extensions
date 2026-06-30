# Clamp Changelog

## [Fix Invalid Output and Add Validation] - {PR_MERGE_DATE}

- Fix invalid `clamp()` output when the minimum and maximum viewport widths are equal (previously produced `Infinity`)
- Fix `NaN` output when a field is empty or contains a non-numeric value
- Accept a comma as a decimal separator (for example `1,5`) instead of silently parsing it as `1`
- Add inline field validation and block copying when any value is invalid
- Guard against a maximum smaller than the minimum
- Update to the latest Raycast API

## [Initial Version] - 2023-11-02
