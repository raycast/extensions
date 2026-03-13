declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { configure as configureDom } from "@testing-library/dom";

// Configure React environment for act()
global.IS_REACT_ACT_ENVIRONMENT = true;

// Configure testing library to use React's act
configure({
  // Disable auto-cleanup to match newer React behavior
  asyncUtilTimeout: 5000,
  reactStrictMode: true,
});

// Configure DOM testing library
configureDom({
  testIdAttribute: "data-testid",
  asyncUtilTimeout: 5000,
});
