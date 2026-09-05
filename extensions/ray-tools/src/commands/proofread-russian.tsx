import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  getSelectedText,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatCorrectedText,
  formatIssueDetail,
  formatIssueTitle,
  getIssueCategoryLabel,
} from "../tools/proofread-russian/markdown";
import { LanguageToolProvider } from "../tools/proofread-russian/provider";
import { RussianProofreadingService } from "../tools/proofread-russian/service";
import type {
  ProofreadingIssue,
  ProofreadingResult,
} from "../tools/proofread-russian/types";

type ProofreadingFormValues = {
  text: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Proofreading failed";
}

function getIssueTintColor(category: ProofreadingIssue["category"]): Color {
  return category === "punctuation" ? Color.Blue : Color.Red;
}

export default function ProofreadRussianCommand() {
  const service = useMemo(
    () => new RussianProofreadingService(new LanguageToolProvider()),
    [],
  );
  const requestNumber = useRef(0);
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<ProofreadingResult>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const checkText = useCallback(
    async (text: string) => {
      const currentRequest = ++requestNumber.current;
      setSourceText(text);
      setResult(undefined);
      setError(undefined);
      setIsLoading(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking Russian text…",
      });

      try {
        const proofreadingResult = await service.check(text);
        if (currentRequest !== requestNumber.current) {
          return;
        }

        setSourceText(proofreadingResult.text);
        setResult(proofreadingResult);
        toast.style = Toast.Style.Success;
        toast.title =
          proofreadingResult.issues.length === 0
            ? "No issues found"
            : `${proofreadingResult.issues.length} ${proofreadingResult.issues.length === 1 ? "issue" : "issues"} found`;
      } catch (proofreadingError) {
        if (currentRequest !== requestNumber.current) {
          return;
        }

        const message = getErrorMessage(proofreadingError);
        setError(message);
        toast.style = Toast.Style.Failure;
        toast.title = "Proofreading failed";
        toast.message = message;
      } finally {
        if (currentRequest === requestNumber.current) {
          setIsLoading(false);
        }
      }
    },
    [service],
  );

  useEffect(() => {
    let active = true;

    getSelectedText()
      .then((selectedText) => {
        if (active && selectedText.trim()) {
          void checkText(selectedText);
        }
      })
      .catch(() => {
        // No selected text is a normal way to open the command; keep the form empty.
      });

    return () => {
      active = false;
    };
  }, [checkText]);

  if (result) {
    return (
      <List
        isShowingDetail
        navigationTitle="Russian proofreading"
        searchBarPlaceholder="Filter issues"
      >
        <List.Section
          title={
            result.issues.length > 0
              ? `Issues (${result.issues.length})`
              : "Result"
          }
        >
          {result.issues.length > 0 ? (
            result.issues.map((issue, index) => (
              <List.Item
                key={`${issue.ruleId ?? issue.category}-${issue.offset}-${index}`}
                id={`issue-${index}`}
                title={formatIssueTitle(result, issue)}
                subtitle={getIssueCategoryLabel(issue.category)}
                icon={{
                  source: Icon.Circle,
                  tintColor: getIssueTintColor(issue.category),
                }}
                detail={
                  <List.Item.Detail
                    markdown={formatIssueDetail(result, issue, index)}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Corrected Text"
                      content={result.correctedText}
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.Paste
                      title="Paste Corrected Text"
                      content={result.correctedText}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    />
                    <Action
                      title="Edit Text"
                      icon={Icon.Pencil}
                      onAction={() => {
                        setResult(undefined);
                        setError(undefined);
                      }}
                    />
                    <Action
                      title="Check Again"
                      icon={Icon.ArrowClockwise}
                      onAction={() => void checkText(result.text)}
                    />
                  </ActionPanel>
                }
              />
            ))
          ) : (
            <List.Item
              title="No issues found"
              subtitle="Russian spelling and punctuation look good"
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              detail={
                <List.Item.Detail markdown={formatCorrectedText(result)} />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Text"
                    content={result.correctedText}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Text"
                    content={result.correctedText}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                  <Action
                    title="Edit Text"
                    icon={Icon.Pencil}
                    onAction={() => {
                      setResult(undefined);
                      setError(undefined);
                    }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
        {result.issues.length > 0 ? (
          <List.Section title="Corrected text">
            <List.Item
              title="Open corrected text"
              subtitle="Copy or paste the corrected version"
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              detail={
                <List.Item.Detail markdown={formatCorrectedText(result)} />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Corrected Text"
                    content={result.correctedText}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Corrected Text"
                    content={result.correctedText}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                  <Action
                    title="Edit Text"
                    icon={Icon.Pencil}
                    onAction={() => {
                      setResult(undefined);
                      setError(undefined);
                    }}
                  />
                  <Action
                    title="Check Again"
                    icon={Icon.ArrowClockwise}
                    onAction={() => void checkText(result.text)}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        ) : null}
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isLoading ? "Checking…" : "Check Russian Text"}
            icon={Icon.Checkmark}
            onSubmit={(values: ProofreadingFormValues) =>
              void checkText(values.text)
            }
          />
          <Action
            title="Use Clipboard Text"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const clipboardText = await Clipboard.readText();
              if (clipboardText?.trim()) {
                void checkText(clipboardText);
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Clipboard is empty",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Russian text"
        placeholder="Select Russian text before opening Raycast, or type it here…"
        value={sourceText}
        onChange={setSourceText}
        autoFocus={!sourceText}
      />
      <Form.Description
        title="Status"
        text={
          error
            ? error
            : isLoading
              ? "Checking spelling and punctuation…"
              : "Checks Russian spelling and punctuation with LanguageTool."
        }
      />
    </Form>
  );
}
