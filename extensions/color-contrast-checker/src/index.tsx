import React, { useState, useEffect, useRef } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  LaunchType,
  LaunchProps,
  LocalStorage,
} from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";
import { checkWCAGCompliance, formatRatio, getContrastRatio } from "./utils/contrast";

interface FormValues {
  firstColor: string;
  secondColor: string;
}

interface LaunchContext {
  hex?: string;
  formattedColor?: string;
}

const PICKING_FOR_KEY = "pickingFor";
const FORM_VALUES_KEY = "formValues";
const LAST_CALLBACK_KEY = "lastCallback";

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const [showResults, setShowResults] = useState(false);
  const processedContextRef = useRef<string | null>(null);

  // Lazy initialization: read from LocalStorage synchronously on first render
  const [firstColor, setFirstColor] = useState(() => {
    // Can't use async here, so we'll just return default and update in useEffect
    return "#000000";
  });
  const [secondColor, setSecondColor] = useState(() => {
    return "#FFFFFF";
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize: Load persisted values OR handle callback
  useEffect(() => {
    async function initialize() {
      const context = props.launchContext;

      // Priority 1: Handle color picker callback (ALWAYS process if present)
      if (context?.hex) {
        const contextKey = `${context.hex}-${context.formattedColor}-${Date.now()}`;

        // Check if this exact callback was already processed
        const lastCallback = await LocalStorage.getItem<string>(LAST_CALLBACK_KEY);
        if (processedContextRef.current === contextKey || lastCallback === contextKey) {
          setIsLoading(false);
          return;
        }

        const pickingFor = await LocalStorage.getItem<string>(PICKING_FOR_KEY);

        if (pickingFor === "first" || pickingFor === "second") {
          // Load current values
          const stored = await LocalStorage.getItem<string>(FORM_VALUES_KEY);
          let currentFirst = firstColor; // Start with current state
          let currentSecond = secondColor;

          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              currentFirst = parsed.firstColor;
              currentSecond = parsed.secondColor;
            } catch (e) {
              console.error("Failed to parse stored values:", e);
            }
          }

          // Update the picked color
          if (pickingFor === "first") {
            currentFirst = context.hex;
          } else {
            currentSecond = context.hex;
          }

          // Persist FIRST, then set state
          await LocalStorage.setItem(
            FORM_VALUES_KEY,
            JSON.stringify({ firstColor: currentFirst, secondColor: currentSecond })
          );

          // Mark this callback as processed
          await LocalStorage.setItem(LAST_CALLBACK_KEY, contextKey);
          processedContextRef.current = contextKey;

          // Batch state updates
          setFirstColor(currentFirst);
          setSecondColor(currentSecond);
          setIsLoading(false);

          await LocalStorage.removeItem(PICKING_FOR_KEY);
          await showToast({
            style: Toast.Style.Success,
            title: pickingFor === "first" ? "First Color Set" : "Second Color Set",
            message: context.hex,
          });
        }

        return;
      }

      // Priority 2: Load persisted values (only when no callback)
      const stored = await LocalStorage.getItem<string>(FORM_VALUES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only update state if the values are actually different
          if (parsed.firstColor !== firstColor || parsed.secondColor !== secondColor) {
            setFirstColor(parsed.firstColor);
            setSecondColor(parsed.secondColor);
          }
        } catch (e) {
          console.error("Failed to parse stored values:", e);
        }
      }

      setIsLoading(false);
    }

    initialize();
  }, []);

  // Persist values when they change (but not during initial load)
  useEffect(() => {
    if (!isLoading) {
      const values = { firstColor, secondColor };
      LocalStorage.setItem(FORM_VALUES_KEY, JSON.stringify(values));
    }
  }, [firstColor, secondColor, isLoading]);

  const isValidHexColor = (color: string): boolean => {
    return /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i.test(color);
  };

  const normalizeHexColor = (color: string): string => {
    return color.startsWith("#") ? color : `#${color}`;
  };

  // Show form for picking colors
  if (!showResults) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Check Contrast"
              icon={Icon.Eye}
              onSubmit={(values: FormValues) => {
                const color1 = normalizeHexColor(values.firstColor);
                const color2 = normalizeHexColor(values.secondColor);

                if (!isValidHexColor(color1) || !isValidHexColor(color2)) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid Color",
                    message: "Please enter valid hex colors (e.g., #FF5733 or FF5733)",
                  });
                  return;
                }

                setShowResults(true);
              }}
            />
            <ActionPanel.Section title="Pick Colors">
              <Action
                title="Pick First Color"
                icon={Icon.EyeDropper}
                onAction={async () => {
                  try {
                    await LocalStorage.setItem(PICKING_FOR_KEY, "first");
                    await crossLaunchCommand({
                      name: "pick-color",
                      type: LaunchType.UserInitiated,
                      extensionName: "color-picker",
                      ownerOrAuthorName: "thomas",
                      context: {
                        callbackLaunchOptions: {
                          name: "index",
                          type: LaunchType.UserInitiated,
                          extensionName: "color-contrast-checker",
                          ownerOrAuthorName: "jessedugas",
                        },
                      },
                    });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Color Picker Not Installed",
                      message: "Please install the Color Picker extension from the Raycast Store",
                    });
                  }
                }}
              />
              <Action
                title="Pick Second Color"
                icon={Icon.EyeDropper}
                onAction={async () => {
                  try {
                    await LocalStorage.setItem(PICKING_FOR_KEY, "second");
                    await crossLaunchCommand({
                      name: "pick-color",
                      type: LaunchType.UserInitiated,
                      extensionName: "color-picker",
                      ownerOrAuthorName: "thomas",
                      context: {
                        callbackLaunchOptions: {
                          name: "index",
                          type: LaunchType.UserInitiated,
                          extensionName: "color-contrast-checker",
                          ownerOrAuthorName: "jessedugas",
                        },
                      },
                    });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Color Picker Not Installed",
                      message: "Please install the Color Picker extension from the Raycast Store",
                    });
                  }
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      >
        <Form.Description text="Enter two hex colors to check their WCAG contrast ratio" />
        <Form.TextField
          id="firstColor"
          title="First Color"
          placeholder="#000000 or 000000"
          value={firstColor}
          onChange={setFirstColor}
        />
        <Form.TextField
          id="secondColor"
          title="Second Color"
          placeholder="#FFFFFF or FFFFFF"
          value={secondColor}
          onChange={setSecondColor}
        />
        <Form.Description text="💡 Press ⌘K to pick colors using the eyedropper" />
      </Form>
    );
  }

  // Show results
  const normalizedFirstColor = normalizeHexColor(firstColor);
  const normalizedSecondColor = normalizeHexColor(secondColor);
  const ratio = getContrastRatio(normalizedFirstColor, normalizedSecondColor);
  const compliance = checkWCAGCompliance(ratio);

  const getStatusIcon = (pass: boolean) => (pass ? "✅" : "❌");
  const getStatusText = (pass: boolean) => (pass ? "**PASS**" : "**FAIL**");

  const markdown = `
# Color Contrast Results

## Contrast Ratio: ${formatRatio(ratio)}

### Selected Colors

**First Color:** \`${normalizedFirstColor.toUpperCase()}\`

**Second Color:** \`${normalizedSecondColor.toUpperCase()}\`

---

## WCAG Compliance

### Level AA (Minimum Accessibility)

${getStatusIcon(compliance.aa.normalText)} **Normal Text** (requires 4.5:1) — ${getStatusText(compliance.aa.normalText)}

${getStatusIcon(compliance.aa.largeText)} **Large Text** (requires 3:1) — ${getStatusText(compliance.aa.largeText)}

### Level AAA (Enhanced Accessibility)

${getStatusIcon(compliance.aaa.normalText)} **Normal Text** (requires 7:1) — ${getStatusText(compliance.aaa.normalText)}

${getStatusIcon(compliance.aaa.largeText)} **Large Text** (requires 4.5:1) — ${getStatusText(compliance.aaa.largeText)}

---

### About Text Sizes

- **Normal text:** Text under 18pt (or 14pt bold)
- **Large text:** Text 18pt and larger (or 14pt bold and larger)

### Quick Reference

- **AA Normal:** Minimum for body text (4.5:1)
- **AA Large:** Minimum for headings (3:1)
- **AAA:** Enhanced contrast for better accessibility
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Contrast Ratio">
            <Detail.Metadata.TagList.Item text={formatRatio(ratio)} color={Color.Blue} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="First Color"
            text={normalizedFirstColor.toUpperCase()}
            icon={{ source: Icon.Circle }}
          />
          <Detail.Metadata.Label
            title="Second Color"
            text={normalizedSecondColor.toUpperCase()}
            icon={{ source: Icon.Circle }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="AA Normal Text">
            <Detail.Metadata.TagList.Item
              text={compliance.aa.normalText ? "Pass" : "Fail"}
              color={compliance.aa.normalText ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="AA Large Text">
            <Detail.Metadata.TagList.Item
              text={compliance.aa.largeText ? "Pass" : "Fail"}
              color={compliance.aa.largeText ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="AAA Normal Text">
            <Detail.Metadata.TagList.Item
              text={compliance.aaa.normalText ? "Pass" : "Fail"}
              color={compliance.aaa.normalText ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="AAA Large Text">
            <Detail.Metadata.TagList.Item
              text={compliance.aaa.largeText ? "Pass" : "Fail"}
              color={compliance.aaa.largeText ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Full Summary"
            content={`The colors ${normalizedFirstColor.toUpperCase()} and ${normalizedSecondColor.toUpperCase()} have a contrast ratio of ${formatRatio(ratio)}`}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Contrast Ratio"
            content={formatRatio(ratio)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy First Color"
            content={normalizedFirstColor}
            shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
          />
          <Action.CopyToClipboard
            title="Copy Second Color"
            content={normalizedSecondColor}
            shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
          />
          <Action
            title="Check New Colors"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              setShowResults(false);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
