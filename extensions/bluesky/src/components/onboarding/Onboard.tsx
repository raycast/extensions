import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { OnboardingImageMd, OnboardingTips, OnboardingTitleMd } from "../../utils/constants";
import { useCallback, useEffect, useState } from "react";

const Onboard = () => {
  const { pop } = useNavigation();
  const [displayedText, setDisplayedText] = useState("");
  const [tipIndex, setTipIndex] = useState(0);

  const titlePartiallyLoaded = () => {
    return displayedText.length > 0 && displayedText.length < `${OnboardingTitleMd}`.length;
  };

  const nextAction = useCallback(() => {
    if (titlePartiallyLoaded()) {
      return;
    }

    if (displayedText.length >= OnboardingTitleMd.length && tipIndex < OnboardingTips.length) {
      setDisplayedText((state) => state + `\n- ${OnboardingTips[tipIndex]}`);
      setTipIndex((state) => state + 1);

      if (tipIndex === OnboardingTips.length - 1) {
        setDisplayedText((state) => state + OnboardingImageMd);
      }

      return;
    }

    pop();
  }, [tipIndex, displayedText]);

  useEffect(() => {
    const messageCharacters = OnboardingTitleMd.split("");
    const interval = setInterval(() => {
      if (messageCharacters.length === 0) {
        clearInterval(interval);
        return;
      }

      setDisplayedText((state) => state + messageCharacters.shift());
    }, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <Detail
      markdown={displayedText}
      actions={
        <ActionPanel>
          <Action title="Continue" onAction={nextAction} />
        </ActionPanel>
      }
    />
  );
};

export default Onboard;
