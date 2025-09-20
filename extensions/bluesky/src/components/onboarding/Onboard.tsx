import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { OnboardingImageMd, OnboardingTips, OnboardingTitleMd } from "../../utils/constants";

const Onboard = () => {
  const { pop } = useNavigation();
  const markdown = OnboardingTitleMd + `\n- ${OnboardingTips.join(`\n- `)}` + OnboardingImageMd;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Continue" onAction={pop} />
        </ActionPanel>
      }
    />
  );
};

export default Onboard;
