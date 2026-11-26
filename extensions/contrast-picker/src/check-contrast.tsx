import { Clipboard, Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ContrastResult from "./components/ContrastResult";
import { resolveColors } from "./lib/extract";
import { getPreferences } from "./lib/settings";
import { ContrastContext } from "./lib/types";

type Props = LaunchProps<{ arguments: Arguments.CheckContrast; launchContext?: ContrastContext }>;

/** Reads the two newest clipboard entries. The older one is the text color, the newer one the background. */
async function readClipboardColors(): Promise<string[]> {
  const read = (offset: number) => Clipboard.readText({ offset }).catch(() => undefined);
  const [newest, previous] = await Promise.all([read(0), read(1)]);
  // A single entry such as "#fff on #000" holds both colors; otherwise use the two newest entries.
  const fromNewest = resolveColors([newest]);
  if (fromNewest.background) return [newest ?? ""];
  return [previous ?? "", newest ?? ""];
}

export default function Command(props: Props) {
  const { useClipboard } = getPreferences();
  const given = resolveColors([
    props.launchContext?.foreground ?? props.arguments.foreground,
    props.launchContext?.background ?? props.arguments.background,
  ]);
  const needsClipboard = useClipboard && !(given.foreground && given.background);

  const { data: clipboard, isLoading } = usePromise(readClipboardColors, [], { execute: needsClipboard });

  if (needsClipboard && isLoading) return <Detail isLoading markdown="" />;

  const fromClipboard = needsClipboard ? resolveColors(clipboard ?? []) : {};
  // Typed or picked colors win. The clipboard fills only what is missing.
  const filled = resolveColors([
    given.foreground,
    given.background,
    fromClipboard.foreground,
    fromClipboard.background,
  ]);

  return <ContrastResult foreground={filled.foreground ?? ""} background={filled.background ?? ""} />;
}
