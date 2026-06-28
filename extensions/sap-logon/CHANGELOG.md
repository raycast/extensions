# SAP GUI Connector

## [Customer Grouping, System Types & Language Prompt] - 2026-06-24

- Added a **customer name** and **system type** (E – development, Q – quality,
  P – production, S – other) to each system, so several customers can share the
  same System ID without clashing.
- Systems are now **grouped by customer** in the list and the menu bar, with a
  colored system-type tag. The list search now also matches customer and type.
- Systems can be saved **without a language**; in that case the language is
  **asked for at connect time** via a submenu (list and menu bar). For the
  direct "Connect to SAP System" command, the SAP GUI's own language prompt is
  used.
- Existing systems are **migrated automatically** (defaulting to type P, no
  customer) and can be assigned a customer/type afterwards via Edit System.
- Custom SAP menu bar icon with light/dark variants.

## [Update] - 2026-04-23

- Improved encoding for passwords
- Added an error message when passwords with unsupported special characters are used

## [Update] - 2026-04-12

- Added Turkish (TR) language option

## [Initial Version] - 2026-02-05
