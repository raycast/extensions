import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Configure testing library to use React's act
configure({
  // Disable auto-cleanup to match newer React behavior
  asyncUtilTimeout: 5000,
  reactStrictMode: true,
});
