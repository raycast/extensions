import { PetState, StatusInfo, StatusLevel, StatusTag } from "../types";
import { Color } from "@raycast/api";
import { Icon } from "./icons";
import { getSleepTimeRemaining } from ".";

export const getStatusIcon = (level?: StatusLevel) => {
  switch (level) {
    case StatusLevel.Critical:
      return Icon.MoodSadDizzy;
    case StatusLevel.Low:
      return Icon.MoodSad;
    case StatusLevel.Medium:
      return Icon.MoodConfused;
    case StatusLevel.High:
      return Icon.MoodSmile;
    case StatusLevel.Perfect:
      return Icon.MoodSmileBeam;
    default:
      return Icon.QuestionMark;
  }
};

export const getStatusTags = (petState: PetState): StatusTag[] => {
  const { health, hunger, happiness, energy, cleanliness, isSleeping } = petState;
  const tags: StatusTag[] = [];

  if (isSleeping) {
    // Calculate remaining sleep time if sleeping
    const sleepTimeRemaining = getSleepTimeRemaining(petState);
    tags.push({ text: `Sleeping (${sleepTimeRemaining} min left)`, color: Color.Blue });
  }

  // Health tags - only add the most severe one
  if (health <= 20) {
    tags.push({ text: "Critical Health", color: Color.Red });
  } else if (health <= 40) {
    tags.push({ text: "Unwell", color: Color.Orange });
  } else if (health <= 60) {
    tags.push({ text: "Recovering", color: Color.Yellow });
  }

  // Hunger tags - only add the most severe one
  if (hunger <= 20) {
    tags.push({ text: "Starving", color: Color.Red });
  } else if (hunger <= 40) {
    tags.push({ text: "Hungry", color: Color.Orange });
  } else if (hunger <= 60) {
    tags.push({ text: "Peckish", color: Color.Yellow });
  }

  // Happiness tags - only add the most severe one
  if (happiness <= 20) {
    tags.push({ text: "Miserable", color: Color.Red });
  } else if (happiness <= 40) {
    tags.push({ text: "Sad", color: Color.Orange });
  } else if (happiness <= 60) {
    tags.push({ text: "Bored", color: Color.Yellow });
  }

  // Cleanliness tags - only add the most severe one
  if (cleanliness <= 20) {
    tags.push({ text: "Filthy", color: Color.Red });
  } else if (cleanliness <= 40) {
    tags.push({ text: "Dirty", color: Color.Orange });
  } else if (cleanliness <= 60) {
    tags.push({ text: "Untidy", color: Color.Yellow });
  }

  // Energy tags - only add the most severe one
  if (energy <= 20 && !isSleeping) {
    tags.push({ text: "Exhausted", color: Color.Red });
  } else if (energy <= 40 && !isSleeping) {
    tags.push({ text: "Very Tired", color: Color.Orange });
  } else if (energy <= 60 && !isSleeping) {
    tags.push({ text: "Drowsy", color: Color.Yellow });
  }

  // Overall mood tags - only if no critical issues
  if (!isSleeping && health > 60 && hunger > 60 && happiness > 60 && energy > 60 && cleanliness > 60) {
    if (health > 80 && hunger > 80 && happiness > 80 && energy > 80 && cleanliness > 80) {
      const thrivingTexts = ["Thriving", "Delighted", "Blissful", "Flourishing", "Jubilant", "On Cloud Nine"];
      const randomThriving = thrivingTexts[Math.floor(Math.random() * thrivingTexts.length)];
      tags.push({ text: randomThriving, color: Color.Green });
    } else {
      const goodMoodTexts = ["Good Mood", "Content", "Happy", "Cheerful", "Pleased", "Satisfied", "Joyful", "Upbeat"];
      const randomGoodMood = goodMoodTexts[Math.floor(Math.random() * goodMoodTexts.length)];
      tags.push({ text: randomGoodMood, color: Color.Green });
    }
  }

  return tags;
};

export function getStatusInfo(value: number): StatusInfo {
  if (value <= 20) {
    return { level: StatusLevel.Critical, color: Color.Red, icon: Icon.Circle };
  } else if (value <= 40) {
    return { level: StatusLevel.Low, color: Color.Orange, icon: Icon.CircleProgress25 };
  } else if (value <= 60) {
    return { level: StatusLevel.Medium, color: Color.Yellow, icon: Icon.CircleProgress50 };
  } else if (value <= 80) {
    return { level: StatusLevel.High, color: Color.Green, icon: Icon.CircleProgress75 };
  } else {
    return { level: StatusLevel.Perfect, color: Color.Green, icon: Icon.CircleProgress100 };
  }
}
