import { environment, MenuBarExtra, open, Color } from "@raycast/api";
import { useEffect, useRef } from "react";
import {
  feedPet,
  healPet,
  playWithPet,
  restPet,
  cleanPet,
  canHealToday,
  getStatusInfo,
  getSleepTimeRemaining,
  getStatusIcon,
  getStatusTags,
  wakeUpPet,
  debugDecreaseStats,
  debugIncreaseStats,
  updatePetState,
} from "./utils";
import { usePetState } from "./hooks/usePetState";
import { Icon } from "./utils/icons";
import { ActionName } from "./types";
import { HEALTH_THRESHOLD } from "./utils/consts";

export default function Command() {
  const { petState, isLoading, handleAction } = usePetState();
  const initialRefreshDone = useRef(false);

  useEffect(() => {
    if (isLoading || initialRefreshDone.current) {
      return;
    }

    const loadPetState = async () => {
      try {
        await handleAction(updatePetState, ActionName.CheckingStatus);
        initialRefreshDone.current = true;
      } catch (error) {
        console.error("Failed to load pet state:", error);
      }
    };

    loadPetState();
  }, [isLoading]);

  const getMenuBarTitle = () => {
    if (!petState) return "No Pet";
    return petState.pet.type;
  };

  const getMenuBarIcon = () => {
    if (!petState) return Icon.QuestionMark;

    const { health, isSleeping } = petState;
    if (isSleeping) return Icon.Sleep;

    const healthStatus = getStatusInfo(health);
    return getStatusIcon(healthStatus.level);
  };

  if (!petState) {
    return (
      <MenuBarExtra
        icon={Icon.QuestionMark}
        isLoading={!initialRefreshDone.current || isLoading}
        tooltip={getMenuBarTitle()}
      >
        <MenuBarExtra.Item
          title="Adopt a Pet"
          icon={Icon.Plus}
          onAction={() => open("raycast://extensions/timoransky/virtual-pet/index")}
        />
      </MenuBarExtra>
    );
  }

  const { hunger, happiness, energy, health, cleanliness, isSleeping } = petState;
  const hungerStatus = getStatusInfo(hunger);
  const happinessStatus = getStatusInfo(happiness);
  const energyStatus = getStatusInfo(energy);
  const healthStatus = getStatusInfo(health);
  const cleanlinessStatus = getStatusInfo(cleanliness);

  // Get status tags for warnings
  const statusTags = getStatusTags(petState);
  const criticalTags = statusTags.filter((tag) => tag.color === Color.Red || tag.color === Color.Orange);

  // Calculate sleep time remaining
  const sleepTimeRemaining = getSleepTimeRemaining(petState);

  return (
    <MenuBarExtra
      icon={{ source: getMenuBarIcon(), tintColor: Color.PrimaryText }}
      isLoading={!initialRefreshDone.current || isLoading}
      tooltip={getMenuBarTitle()}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Hunger: ${Math.round(hunger)}%`}
          icon={{ source: hungerStatus.icon, tintColor: hungerStatus.color }}
        />
        <MenuBarExtra.Item
          title={`Happiness: ${Math.round(happiness)}%`}
          icon={{ source: happinessStatus.icon, tintColor: happinessStatus.color }}
        />
        <MenuBarExtra.Item
          title={`Energy: ${Math.round(energy)}%`}
          icon={{ source: energyStatus.icon, tintColor: energyStatus.color }}
        />
        <MenuBarExtra.Item
          title={`Cleanliness: ${Math.round(cleanliness)}%`}
          icon={{ source: cleanlinessStatus.icon, tintColor: cleanlinessStatus.color }}
        />
        <MenuBarExtra.Item
          title={`Health: ${Math.round(health)}%`}
          icon={{ source: healthStatus.icon, tintColor: healthStatus.color }}
        />
      </MenuBarExtra.Section>

      {criticalTags.length > 0 && (
        <MenuBarExtra.Section title="Warnings">
          {criticalTags.map((tag, index) => (
            <MenuBarExtra.Item
              key={index}
              title={tag.text}
              icon={{ source: Icon.ExclamationMark, tintColor: tag.color }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {!isSleeping ? (
          <>
            <MenuBarExtra.Item
              title="Feed"
              icon={Icon.Leaf}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => handleAction(feedPet, ActionName.Feeding)}
            />
            <MenuBarExtra.Item
              title="Play"
              icon={Icon.TennisBall}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() => handleAction(playWithPet, ActionName.Playing)}
            />
            <MenuBarExtra.Item
              title="Clean"
              icon={Icon.Droplets}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => handleAction(cleanPet, ActionName.Cleaning)}
            />
            <MenuBarExtra.Item
              title="Put to Sleep"
              icon={{ source: Icon.Sleep, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => handleAction(restPet, ActionName.Resting)}
            />
            {health <= HEALTH_THRESHOLD &&
              (canHealToday(petState) ? (
                <MenuBarExtra.Item
                  title="Heal"
                  icon={Icon.BandAid}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                  onAction={() => handleAction(healPet, ActionName.Healing)}
                />
              ) : (
                <MenuBarExtra.Item
                  title="Already Healed Today"
                  icon={{ source: Icon.BandAid, tintColor: Color.SecondaryText }}
                />
              ))}
          </>
        ) : (
          <>
            <MenuBarExtra.Item
              title={`Sleeping (${sleepTimeRemaining} min remaining)`}
              icon={{ source: Icon.Sleep, tintColor: Color.SecondaryText }}
            />
            <MenuBarExtra.Item
              title="Wake Up Early"
              icon={Icon.Alarm}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
              onAction={() => handleAction(wakeUpPet, ActionName.WakeUp)}
            />
          </>
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Full View"
          icon={Icon.Window}
          onAction={() => open("raycast://extensions/timoransky/virtual-pet/index")}
        />
      </MenuBarExtra.Section>

      {environment.isDevelopment && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Debug: Decrease Stats"
            icon={Icon.Bug}
            onAction={() => handleAction(debugDecreaseStats, ActionName.Debug)}
          />
          <MenuBarExtra.Item
            title="Debug: Increase Stats"
            icon={Icon.Bug}
            onAction={() => handleAction(debugIncreaseStats, ActionName.Debug)}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
