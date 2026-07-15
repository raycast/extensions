import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  environment,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { callbackLaunchCommand, LaunchOptions } from "raycast-cross-extension";
import { useCallback, useEffect, useMemo } from "react";
import { ViewOWLAction } from "./components/ViewOWLAction";
import { useCurrentLanguage } from "./hooks/languages";
import { useInitializeOWLs } from "./hooks/useInitializeOWLs";
import { OWL } from "./types/owl";
import { UseOWLs, useOWLs } from "./utils/owl";

type Mapping = Record<
  string,
  {
    lower: string;
    upper: string;
  }
>;

type LaunchContext = {
  callbackLaunchOptions?: LaunchOptions;
};

function tryLoadMapping(keyboard: string): null | Mapping {
  try {
    return JSON.parse(readFileSync(`${environment.assetsPath}/keyboards/json/${keyboard}.json`, "utf-8"));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return null;
  }
}

async function alertLoadingError(keyboard: string) {
  return confirmAlert({
    title: "Could not load keyboards",
    message: `Couldn't find the keyboard for ${keyboard}, it may not be supported.`,
    icon: Icon.Warning,
  });
}

async function runOWL(
  owl: OWL,
  pushHistory: UseOWLs["pushHistory"],
  callbackLaunchOptions?: LaunchContext["callbackLaunchOptions"],
) {
  const mappingFrom = tryLoadMapping(owl.from);
  const mappingTo = tryLoadMapping(owl.to);

  if (mappingFrom === null || mappingTo === null) {
    await alertLoadingError(mappingFrom === null ? owl.from : owl.to);
    return;
  }

  const characterToIndex: Record<string, string> = Object.entries(mappingFrom).reduce(
    (accumulator, [index, { lower, upper }]) => ({
      ...accumulator,
      [lower]: index,
      [upper]: index,
    }),
    {},
  );

  try {
    const selectedText = await getSelectedText();

    const transformedText = Array.from(selectedText)
      .map((character) => {
        const mappedCharacter = mappingTo[characterToIndex[character]];

        if (!mappedCharacter) {
          return character; // If no mapping exists, return the original character
        }

        const isLower = character === character.toLowerCase();
        return mappedCharacter[isLower ? "lower" : "upper"];
      })
      .join("");

    await Clipboard.paste(transformedText).then(() => {
      pushHistory?.(owl, selectedText, transformedText);
    });
    await showHUD(`${owl.from} → ${owl.to}`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    if (callbackLaunchOptions) {
      try {
        await callbackLaunchCommand(callbackLaunchOptions);
      } catch (callbackError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Callback Launch Failed",
          message: String(callbackError),
        });
      }
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}

export default function OWLCommand({
  launchContext = {},
}: Readonly<
  LaunchProps<{
    launchContext: LaunchContext;
  }>
>) {
  const { callbackLaunchOptions } = launchContext;

  useInitializeOWLs();

  const { value: currentLanguage, isLoading } = useCurrentLanguage();
  const { owls, pushHistory } = useOWLs();

  const currentOWLs = useMemo(() => {
    if (isLoading || !currentLanguage) {
      return [];
    }

    return owls[currentLanguage] || [];
  }, [currentLanguage, isLoading, owls]);

  const triggerOWL: (owl: OWL) => void = useCallback(
    (owl) => {
      runOWL(owl, pushHistory, callbackLaunchOptions).then();
    },
    [pushHistory, callbackLaunchOptions],
  );

  useEffect(() => {
    if (currentOWLs.length === 1) {
      triggerOWL(currentOWLs[0]);
    }
  }, [currentOWLs]);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title={"No OWLs Found"} description="Add OWLs to start using them." />
      {currentOWLs.map((owl) => {
        return (
          <List.Item
            key={owl.id}
            title={`${owl.from} → ${owl.to}`}
            actions={
              <ActionPanel>
                <Action title={"Select Owl"} icon={Icon.Bolt} onAction={() => triggerOWL(owl)} />
                <ViewOWLAction owl={owl} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
