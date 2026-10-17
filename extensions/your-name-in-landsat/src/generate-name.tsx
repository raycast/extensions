import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  LaunchType,
  Toast,
  launchCommand,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { countLetters, generate, ComposeResult, MAX_LETTERS, normalizeName } from "./lib/compose";
import { pushHistory } from "./lib/history";
import { SITE_URL } from "./lib/tiles";
import { LandsatDetail } from "./lib/detail";
import { TileActions } from "./lib/actions";
import { NameForm } from "./lib/name-form";

type GenerateRequest = {
  name: string;
  spacing?: number;
};

export default function Command(props: LaunchProps<{ arguments: Arguments.GenerateName }>) {
  const initial = (props.arguments?.name ?? "").trim();
  const spacingArg = props.arguments?.spacing;
  const parsedSpacingArg = spacingArg !== undefined && spacingArg !== "" ? Number.parseInt(spacingArg, 10) : undefined;
  const [request, setRequest] = useState<GenerateRequest>({
    name: initial,
    spacing:
      parsedSpacingArg !== undefined && Number.isFinite(parsedSpacingArg) && parsedSpacingArg >= 0
        ? parsedSpacingArg
        : undefined,
  });
  return <GenerateView request={request} onEdit={setRequest} />;
}

function GenerateView({ request, onEdit }: { request: GenerateRequest; onEdit: (next: GenerateRequest) => void }) {
  const { push } = useNavigation();
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const { name, spacing } = request;
  const displayName = normalizeName(name).toUpperCase().trim();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const letters = countLetters(name);
    if (letters === 0) {
      void showToast({ style: Toast.Style.Failure, title: "Type something…" });
      void popToRoot();
      return;
    }
    if (letters > MAX_LETTERS) {
      void showToast({ style: Toast.Style.Failure, title: `Max ${MAX_LETTERS} letters` });
      void popToRoot();
      return;
    }

    (async () => {
      try {
        const r = await generate(name, { spacing });
        if (cancelled) return;
        setResult(r);
        await pushHistory({ name, filePath: r.filePath, exportFilePath: r.exportFilePath, tileIds: r.tileIds });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, nonce, spacing]);

  return (
    <LandsatDetail
      displayName={displayName}
      filePath={result?.filePath}
      tileIds={result?.tileIds ?? []}
      isLoading={isLoading}
      error={error}
      actions={
        <ActionPanel>
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => setNonce((n) => n + 1)}
          />
          {result && <Action.Paste title="Paste Image to Active App" content={{ file: result.exportFilePath }} />}
          <Action
            title="Edit Name"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() =>
              push(
                <NameForm
                  initialName={name}
                  initialSpacing={spacing}
                  onSubmit={({ name: nextName, spacing: nextSpacing }) =>
                    onEdit({ name: nextName, spacing: nextSpacing })
                  }
                />,
              )
            }
          />
          {result && (
            <TileActions
              exportFilePath={result.exportFilePath}
              tileIds={result.tileIds}
              downloadBaseName={displayName || "landsat"}
              includePaste={false}
            />
          )}
          <Action
            title="Show History"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={async () => {
              try {
                await launchCommand({ name: "show-history", type: LaunchType.UserInitiated });
              } catch (e) {
                await showFailureToast(e, { title: "Could not open History" });
              }
            }}
          />
          <Action.OpenInBrowser
            title="Open Original Website"
            url={SITE_URL}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
