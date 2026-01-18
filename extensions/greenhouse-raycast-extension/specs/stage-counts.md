# Pipeline Stage Counts

## Overview
Show applicant counts in pipeline stage headings for quick visibility.

## Current Behavior
- Pipeline shows stages as `List.Section` with title only
- Count is not visible in the heading

## Desired Behavior
- Each stage heading shows the count of applicants
- Format: "Stage Name" with count visible (e.g., subtitle or inline)

## Requirements
- Use `List.Section` with `title` and `subtitle` props
- Subtitle shows the count (e.g., "12 applicants" or just "12")
- Preserve existing days-since accessory on individual applicants

## Constraints
- Raycast does not support custom section background colors
- Keep the implementation simple using built-in List.Section props

## Acceptance Criteria
- Pipeline stages show stage name and applicant count in heading
- Count updates correctly when data changes
