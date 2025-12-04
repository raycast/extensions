import { Action, ActionPanel, confirmAlert, Detail, environment } from "@raycast/api";
import {
  feedPet,
  formatTime,
  getStatusInfo,
  healPet,
  playWithPet,
  restPet,
  cleanPet,
  canHealToday,
  wakeUpPet,
  getPetImagePath,
  getStatusTags,
  debugDecreaseStats,
  debugIncreaseStats,
  updatePetState,
} from "./utils";
import AdoptPet from "./adopt";
import { usePetState } from "./hooks/usePetState";
import { Icon } from "./utils/icons";
import { ActionName } from "./types";
import { HEALTH_THRESHOLD } from "./utils/consts";

export default function ViewPet() {
  const { petState, isLoading, handleAction, removePetState } = usePetState();

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!petState) {
    return <AdoptPet />;
  }

  const { pet, hunger, happiness, energy, health, cleanliness, adopted, isSleeping } = petState;
  const hungerStatus = getStatusInfo(hunger);
  const happinessStatus = getStatusInfo(happiness);
  const energyStatus = getStatusInfo(energy);
  const healthStatus = getStatusInfo(health);
  const cleanlinessStatus = getStatusInfo(cleanliness);

  // Get status tags
  const statusTags = getStatusTags(petState);

  // Determine pet image
  const petImage = getPetImagePath(petState);

  const markdown = `
# This is your pet, ${pet.type}!

![${pet.type}](${petImage})

${isSleeping ? "It is sleeping right now, so let it rest for a while. \n\n*You can wake your pet early, but they might be grumpy!*" : "Attend to your pet's needs to keep it happy and healthy."}
`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            {statusTags.map((tag, i) => (
              <Detail.Metadata.TagList.Item key={i} text={tag.text} color={tag.color} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Hunger"
            icon={{ source: hungerStatus.icon, tintColor: hungerStatus.color }}
            text={`${Math.round(hunger)}%`}
          />
          <Detail.Metadata.Label
            title="Happiness"
            icon={{ source: happinessStatus.icon, tintColor: happinessStatus.color }}
            text={`${Math.round(happiness)}%`}
          />
          <Detail.Metadata.Label
            title="Energy"
            icon={{ source: energyStatus.icon, tintColor: energyStatus.color }}
            text={`${Math.round(energy)}%`}
          />
          <Detail.Metadata.Label
            title="Cleanliness"
            icon={{ source: cleanlinessStatus.icon, tintColor: cleanlinessStatus.color }}
            text={`${Math.round(cleanliness)}%`}
          />
          <Detail.Metadata.Label
            title="Health"
            icon={{ source: healthStatus.icon, tintColor: healthStatus.color }}
            text={`${Math.round(health)}%`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Adopted" text={formatTime(adopted)} />
          <Detail.Metadata.Label title="Last updated" text={formatTime(petState.lastUpdated)} />
          {petState.lastHealed && <Detail.Metadata.Label title="Last healed" text={formatTime(petState.lastHealed)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isSleeping && (
            <>
              <Action
                title="Feed"
                icon={Icon.Leaf}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => handleAction(feedPet, ActionName.Feeding)}
              />
              <Action
                title="Play"
                icon={Icon.TennisBall}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={() => handleAction(playWithPet, ActionName.Playing)}
              />
              <Action
                title="Clean"
                icon={Icon.Droplets}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={() => handleAction(cleanPet, ActionName.Cleaning)}
              />
              {health <= HEALTH_THRESHOLD && canHealToday(petState) && (
                <Action
                  title={"Heal"}
                  icon={Icon.BandAid}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                  onAction={() => handleAction(healPet, ActionName.Healing)}
                />
              )}
            </>
          )}

          {!isSleeping ? (
            <Action
              title="Rest"
              icon={Icon.Sleep}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => handleAction(restPet, ActionName.Resting)}
            />
          ) : (
            <Action
              title={"Wake Up"}
              icon={Icon.Alarm}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => handleAction(wakeUpPet, ActionName.WakeUp)}
            />
          )}

          <Action
            title="Refresh Status"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={() => handleAction(updatePetState, ActionName.CheckingStatus)}
          />

          <ActionPanel.Section>
            <Action
              title="Adopt New Pet"
              icon={Icon.Plus}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Are you sure you want to adopt a new pet?",
                    message: "Your current pet and all their data will be removed.",
                  })
                ) {
                  removePetState();
                }
              }}
            />
          </ActionPanel.Section>

          {environment.isDevelopment && (
            <ActionPanel.Section>
              <Action
                title="Debug: Decrease Stats"
                icon={Icon.Bug}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => handleAction(debugDecreaseStats, ActionName.Debug)}
              />
              <Action
                title="Debug: Increase Stats"
                icon={Icon.Bug}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                onAction={() => handleAction(debugIncreaseStats, ActionName.Debug)}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
