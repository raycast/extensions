import {
  XcodeCodeSnippet,
  XcodeCodeSnippetDefaultVersion,
} from "../../models/xcode-code-snippet/xcode-code-snippet.model";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { XcodeCodeSnippetProgrammingLanguage } from "../../models/xcode-code-snippet/xcode-code-snippet-programming-language.model";
import { XcodeCodeSnippetProgrammingLanguageName } from "../../shared/xcode-code-snippet-programming-language-name";
import { XcodeCodeSnippetCompletionScopeName } from "../../shared/xcode-code-snippet-completion-scope-name";
import { XcodeCodeSnippetCompletionScope } from "../../models/xcode-code-snippet/xcode-code-snippet-completion-scope.model";
import { XcodeCodeSnippetService } from "../../services/xcode-code-snippet.service";
import { v4 as uuidv4 } from "uuid";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { useState } from "react";
import { XcodeCodeSnippetFormValues } from "../../models/xcode-code-snippet/xcode-code-snippet-form-values.model";

/**
 * Xcode Code Snippet Form
 */
export function XcodeCodeSnippetForm(props: {
  draftValues?: XcodeCodeSnippetFormValues;
  codeSnippet?: XcodeCodeSnippet;
  onSubmit?: () => void;
}) {
  const navigation = useNavigation();
  const [title, setTitle] = useState(
    props.draftValues?.title ?? props.codeSnippet?.IDECodeSnippetTitle ?? "My Code Snippet"
  );
  const [titleError, setTitleError] = useState<string | undefined>();
  const [summary, setSummary] = useState(props.draftValues?.summary ?? props.codeSnippet?.IDECodeSnippetSummary ?? "");
  const [contents, setContents] = useState(
    props.draftValues?.summary ?? props.codeSnippet?.IDECodeSnippetContents ?? ""
  );
  const [contentsError, setContentsError] = useState<string | undefined>();
  const [language, setLanguage] = useState(
    props.draftValues?.language ??
      props.codeSnippet?.IDECodeSnippetLanguage ??
      XcodeCodeSnippetProgrammingLanguage.swift
  );
  const [completionPrefix, setCompletionPrefix] = useState(
    props.draftValues?.completionPrefix ?? props.codeSnippet?.IDECodeSnippetCompletionPrefix ?? ""
  );
  const [completionPrefixError, setCompletionPrefixError] = useState<string | undefined>();
  const [completionScopes, setCompletionScopes] = useState(
    props.draftValues?.completionScopes ??
      props.codeSnippet?.IDECodeSnippetCompletionScopes ?? [XcodeCodeSnippetCompletionScope.all]
  );
  const [completionScopesError, setCompletionScopesError] = useState<string | undefined>();
  return (
    <Form
      enableDrafts={!props.codeSnippet}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.SaveDocument}
            title="Save Code Snippet"
            onSubmit={async (formValues: XcodeCodeSnippetFormValues) => {
              await submit(formValues, props.codeSnippet);
              props.onSubmit ? props.onSubmit() : undefined;
              await navigation.pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={(title) => {
          setTitleError(undefined);
          setTitle(title);
        }}
        onBlur={() => setTitleError(!title.length ? "Title shouldn't be empty" : undefined)}
        error={titleError}
      />
      <Form.TextField id="summary" title="Summary" value={summary} onChange={setSummary} />
      <Form.TextArea
        id="contents"
        title="Code Snippet"
        value={contents}
        onChange={(contents) => {
          setContentsError(undefined);
          setContents(contents);
        }}
        onBlur={() => setContentsError(!contents.length ? "Code Snippet shouldn't be empty" : undefined)}
        error={contentsError}
      />
      <Form.Dropdown
        id="language"
        title="Language"
        value={language}
        onChange={(language) => setLanguage(language as XcodeCodeSnippetProgrammingLanguage)}
      >
        {Object.keys(XcodeCodeSnippetProgrammingLanguage).map((language) => {
          return (
            <Form.Dropdown.Item
              key={language}
              value={XcodeCodeSnippetProgrammingLanguage[language as keyof typeof XcodeCodeSnippetProgrammingLanguage]}
              title={XcodeCodeSnippetProgrammingLanguageName(
                XcodeCodeSnippetProgrammingLanguage[language as keyof typeof XcodeCodeSnippetProgrammingLanguage]
              )}
            />
          );
        })}
      </Form.Dropdown>
      <Form.TextField
        id="completionPrefix"
        title="Completion"
        value={completionPrefix}
        onChange={(completionPrefix) => {
          setCompletionPrefixError(undefined);
          setCompletionPrefix(completionPrefix);
        }}
        onBlur={() => setCompletionPrefixError(!completionPrefix.length ? "Completion shouldn't be empty" : undefined)}
        error={completionPrefixError}
      />
      <Form.TagPicker
        id="completionScopes"
        title="Availability"
        value={completionScopes}
        onChange={(completionScopes) => {
          setCompletionScopesError(undefined);
          setCompletionScopes(completionScopes as XcodeCodeSnippetCompletionScope[]);
        }}
        onBlur={() =>
          setCompletionScopesError(!completionScopes.length ? "Availability shouldn't be empty" : undefined)
        }
        error={completionScopesError}
      >
        {Object.keys(XcodeCodeSnippetCompletionScope).map((completionScope) => {
          return (
            <Form.TagPicker.Item
              key={completionScope}
              value={XcodeCodeSnippetCompletionScope[completionScope as keyof typeof XcodeCodeSnippetCompletionScope]}
              title={XcodeCodeSnippetCompletionScopeName(
                XcodeCodeSnippetCompletionScope[completionScope as keyof typeof XcodeCodeSnippetCompletionScope]
              )}
            />
          );
        })}
      </Form.TagPicker>
    </Form>
  );
}

/**
 * Submit Form
 * @param values The Form Values
 * @param codeSnippet The existing Xcode Code Snippet, if available
 */
async function submit(values: XcodeCodeSnippetFormValues, codeSnippet?: XcodeCodeSnippet) {
  await operationWithUserFeedback(
    "Saving Code Snippet",
    "Successfully saved Code Snippet",
    "An error occurred while saving the Code Snippet",
    () =>
      XcodeCodeSnippetService.save({
        IDECodeSnippetIdentifier: codeSnippet?.IDECodeSnippetIdentifier ?? uuidv4().toUpperCase(),
        IDECodeSnippetVersion: codeSnippet?.IDECodeSnippetVersion ?? XcodeCodeSnippetDefaultVersion,
        IDECodeSnippetUserSnippet: codeSnippet?.IDECodeSnippetUserSnippet ?? true,
        IDECodeSnippetTitle: values.title,
        IDECodeSnippetSummary: values.summary,
        IDECodeSnippetCompletionPrefix: values.completionPrefix,
        IDECodeSnippetCompletionScopes: values.completionScopes,
        IDECodeSnippetLanguage: values.language,
        IDECodeSnippetContents: values.contents,
      })
  );
}
