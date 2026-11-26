import { Clipboard, Detail, Form, LaunchProps, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ContrastForm from "./components/ContrastForm";
import ContrastResult from "./components/ContrastResult";
import { extractColors, fillFromClipboard, resolveSlots } from "./lib/extract";
import { getPreferences, useFontSettings } from "./lib/settings";
import { ContrastContext } from "./lib/types";

type Props = LaunchProps<{ arguments: Arguments.CheckContrast; launchContext?: ContrastContext }>;

/** Reads the two newest clipboard entries and returns the colors in them, oldest first. */
async function readClipboardColors(): Promise<string[]> {
  const read = (offset: number) => Clipboard.readText({ offset }).catch(() => undefined);
  const [newest, previous] = await Promise.all([read(0), read(1)]);
  return [...extractColors(previous), ...extractColors(newest)].slice(-2);
}

export default function Command(props: Props) {
  const { useClipboard } = getPreferences();
  const given = resolveSlots(
    props.launchContext?.foreground ?? props.arguments.foreground,
    props.launchContext?.background ?? props.arguments.background,
  );
  const needsClipboard = useClipboard && !(given.foreground && given.background);

  const { data: clipboard, isLoading } = usePromise(readClipboardColors, [], { execute: needsClipboard });

  if (needsClipboard && isLoading) return <Detail isLoading />;

  // Typed or picked colors keep their slot. The clipboard fills only the empty slots.
  const colors = needsClipboard ? fillFromClipboard(given, clipboard ?? []) : given;

  if (colors.foreground && colors.background) {
    return <ContrastResult foreground={colors.foreground} background={colors.background} />;
  }
  return <ColorForm foreground={colors.foreground} background={colors.background} />;
}

/** The form for missing colors. It opens the result as a new screen, so Esc returns to the form. */
function ColorForm(props: { foreground?: string; background?: string }) {
  const { push } = useNavigation();
  const font = useFontSettings();

  // Wait for the saved font settings. A form that opens with defaults would overwrite them.
  if (font.isLoading) return <Form isLoading />;

  return (
    <ContrastForm
      foreground={props.foreground}
      background={props.background}
      sizePx={font.sizePx}
      weight={font.weight}
      onSubmit={async (values) => {
        if (values.sizePx) await font.setSize(values.sizePx);
        if (values.weight) await font.setWeight(values.weight);
        push(<ContrastResult foreground={values.foreground} background={values.background} />);
      }}
    />
  );
}
