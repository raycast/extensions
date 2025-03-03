import { Grid, ActionPanel, Action, Icon } from "@raycast/api";
import { SpringEasing, springEasings } from "./models/easings";
import { EasingCard } from "./components/EasingCard";
import { CustomEasingCard } from "./components/CustomEasingCard";
import { AddEasingForm } from "./components/AddEasingForm";
import { useEffect, useState } from "react";
import { getCustomEasings } from "./utils/storage";

export default function Command() {
  const [customEasings, setCustomEasings] = useState<SpringEasing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCustomEasings() {
    setIsLoading(true);
    try {
      const easings = await getCustomEasings();
      setCustomEasings(easings);
    } catch (error) {
      console.error("Failed to load custom easings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomEasings();
  }, []);

  return (
    <Grid
      columns={5}
      fit={Grid.Fit.Contain}
      searchBarPlaceholder="Search spring easings..."
      navigationTitle="Spring Easings"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Custom Easing"
            icon={Icon.Plus}
            target={<AddEasingForm onEasingAdded={loadCustomEasings} />}
          />
        </ActionPanel>
      }
    >
      {customEasings.length > 0 && (
        <Grid.Section title="Custom Easings">
          {customEasings.map((easing) => (
            <CustomEasingCard key={easing.name} easing={easing} onEasingRemoved={loadCustomEasings} />
          ))}
        </Grid.Section>
      )}

      <Grid.Section title="Spring Easings">
        {springEasings.map((easing) => (
          <EasingCard key={easing.name} easing={easing} />
        ))}
      </Grid.Section>
    </Grid>
  );
}
