import assert from "node:assert/strict";
import test from "node:test";

import { getCreateIssueValuesFromTemplate } from "../src/helpers/issueTemplates.ts";
import type { IssueTemplateResult } from "../src/api/getIssueTemplates.ts";

test("pre-fills description from top-level template.description when templateData has no description", () => {
  const template: IssueTemplateResult = {
    id: "tpl_123",
    name: "Bug Report",
    description: "### Steps to reproduce\n1. Open app\n2. Click button",
    type: "issue",
    templateData: {
      priority: 1,
    },
  };

  const values = getCreateIssueValuesFromTemplate(template);

  assert.equal(values.description, "### Steps to reproduce\n1. Open app\n2. Click button");
  assert.equal(values.priority, "1");
});

test("pre-fills description from templateData.description when present", () => {
  const template: IssueTemplateResult = {
    id: "tpl_456",
    name: "Feature Request",
    description: "Fallback description",
    type: "issue",
    templateData: {
      description: "Primary templateData description",
    },
  };

  const values = getCreateIssueValuesFromTemplate(template);

  assert.equal(values.description, "Primary templateData description");
});

test("falls back to default description when both templateData and top-level description are absent", () => {
  const template: IssueTemplateResult = {
    id: "tpl_789",
    name: "Empty Template",
    type: "issue",
    templateData: {},
  };

  const values = getCreateIssueValuesFromTemplate(template, { description: "Default fallback" });

  assert.equal(values.description, "Default fallback");
});
