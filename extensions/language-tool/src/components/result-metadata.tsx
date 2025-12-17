import { Detail, Icon, Color } from "@raycast/api";
import type { CheckTextResponse } from "../types";

type ResultMetadataProps = {
  result: CheckTextResponse;
  appliedSuggestions: Set<number>;
};

export function ResultMetadata({
  result,
  appliedSuggestions,
}: ResultMetadataProps) {
  const matchesCount = result.matches?.length || 0;
  const appliedCount = appliedSuggestions.size;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Total Issues" text={`${matchesCount}`} />
      <Detail.Metadata.Label
        title="Applied"
        text={`${appliedCount}/${matchesCount}`}
      />

      {result.language && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Language"
            text={result.language.name}
            icon={Icon.Globe}
          />
        </>
      )}

      {result.matches && result.matches.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Issues"
            text={`${result.matches.length} issues found`}
          />

          {result.matches.map((match, index) => {
            const isApplied = appliedSuggestions.has(index);
            const replacement = match.replacements[0]?.value || "";
            const original = match.context.text.slice(
              match.context.offset,
              match.context.offset + match.context.length,
            );

            return (
              <Detail.Metadata.Label
                key={index}
                title={
                  isApplied
                    ? "✅ " + (match.shortMessage || match.message)
                    : match.shortMessage || match.message
                }
                text={`"${original}" → "${replacement}"`}
              />
            );
          })}
        </>
      )}

      {matchesCount === 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Great!"
            text="No issues found"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
        </>
      )}
    </Detail.Metadata>
  );
}
