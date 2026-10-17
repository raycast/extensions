/**
 * Shared vitest setup: registers the jest-dom matchers (toHaveAttribute,
 * toBeInTheDocument, ...) used by the component tests. Adding matchers is
 * environment-agnostic, so this is safe for the node-environment tests too.
 */
import "@testing-library/jest-dom/vitest";
