import { Pet, type PetState } from "../types";
import { DECAY_RATES } from "./consts";

export function adoptPet(pet: Pet): PetState {
  return {
    pet,
    hunger: 100,
    happiness: 100,
    energy: 100,
    health: 100,
    cleanliness: 100,
    lastUpdated: Date.now(),
    adopted: Date.now(),
  };
}

export function feedPet(state: PetState): PetState {
  // Cannot feed while sleeping
  if (state.isSleeping) return state;

  // Feeding improves hunger significantly
  // Slightly decreases cleanliness (messy eating)
  // Gives a small energy boost
  return {
    ...state,
    hunger: Math.min(100, state.hunger + 30),
    cleanliness: Math.max(0, state.cleanliness - 5),
    energy: Math.min(100, state.energy + 5),
  };
}

export function playWithPet(state: PetState): PetState {
  // Cannot play while sleeping
  if (state.isSleeping) return state;

  // If energy is too low, pet refuses to play
  if (state.energy <= 20) {
    return {
      ...state,
      happiness: Math.max(0, state.happiness - 5), // Gets upset if forced to play when tired
    };
  }

  return {
    ...state,
    happiness: Math.min(100, state.happiness + 30),
    energy: Math.max(0, state.energy - 20),
    hunger: Math.max(0, state.hunger - 10),
    cleanliness: Math.max(0, state.cleanliness - 5), // Gets a bit dirty when playing
  };
}

export function restPet(state: PetState): PetState {
  // Start sleeping for 1 hour
  const sleepUntil = Date.now() + 60 * 60 * 1000; // 1 hour from now

  return {
    ...state,
    isSleeping: true,
    sleepUntil: sleepUntil,
  };
}

export function wakeUpPet(state: PetState): PetState {
  // If pet is not sleeping, return the state unchanged
  if (!state.isSleeping) return state;

  // If sleepUntil is not set, something went wrong
  if (!state.sleepUntil) return state;

  // Calculate how long the pet has been sleeping
  const now = Date.now();
  const sleepStartTime = state.sleepUntil - 60 * 60 * 1000; // 1 hour before wake time
  const sleepDuration = now - sleepStartTime;
  const sleepHours = sleepDuration / (1000 * 60 * 60);

  // Energy recovery is proportional to sleep duration, maximum 50% for full hour
  // Minimum 5% recovery even if woken immediately
  const energyRecovery = Math.max(5, Math.min(50, Math.floor(sleepHours * 50)));

  // Calculate moodiness from being woken up early
  // The earlier they're woken up, the more moody they get
  const fullSleepDuration = 1; // 1 hour
  const sleepCompletion = Math.min(1, sleepHours / fullSleepDuration);
  const moodPenalty = Math.floor((1 - sleepCompletion) * 20); // Up to 20% happiness reduction

  return {
    ...state,
    isSleeping: false,
    sleepUntil: undefined,
    energy: Math.min(100, state.energy + energyRecovery),
    happiness: Math.max(0, state.happiness - moodPenalty),
  };
}

export function healPet(state: PetState): PetState {
  // Cannot heal while sleeping
  if (state.isSleeping) return state;

  // Record that pet was healed today
  return {
    ...state,
    health: Math.min(100, state.health + 50),
    happiness: Math.min(100, state.happiness + 20),
    energy: Math.min(100, state.energy + 20),
    hunger: Math.min(100, state.cleanliness + 20),
    lastHealed: Date.now(),
  };
}

export function cleanPet(state: PetState): PetState {
  // Cannot clean while sleeping
  if (state.isSleeping) return state;

  // Cleaning improves cleanliness significantly
  // Slightly improves happiness
  return {
    ...state,
    cleanliness: Math.min(100, state.cleanliness + 35),
    happiness: Math.min(100, state.happiness + 5), // Being clean makes pet happier
  };
}

export function canHealToday(state: PetState): boolean {
  if (!state.lastHealed) return true;

  const now = new Date();
  const lastHealed = new Date(state.lastHealed);

  // Check if last healed was on a different calendar day
  return (
    now.getDate() !== lastHealed.getDate() ||
    now.getMonth() !== lastHealed.getMonth() ||
    now.getFullYear() !== lastHealed.getFullYear()
  );
}

export function updatePetState(state: PetState): PetState {
  const now = Date.now();
  const hoursPassed = (now - state.lastUpdated) / (1000 * 60 * 60);

  // Create a new state object with updated values
  const newState = { ...state, lastUpdated: now };

  // Check if pet is sleeping
  if (state.isSleeping && state.sleepUntil) {
    // If sleep time has elapsed, wake up the pet and give energy boost
    if (now >= state.sleepUntil) {
      newState.isSleeping = false;
      newState.sleepUntil = undefined;
      newState.energy = Math.min(100, state.energy + 40); // Energy boost after full sleep
      return newState;
    } else {
      // Still sleeping, don't apply regular decay
      return newState;
    }
  }

  // Pet might fall asleep if very tired (only when not already sleeping)
  if (!state.isSleeping && state.energy <= 20 && Math.random() < 0.3) {
    // 30% chance when tired
    newState.isSleeping = true;
    newState.sleepUntil = now + 60 * 60 * 1000; // Sleep for 1 hour
    return newState;
  }

  // 1. Hunger (Base Decay: Fast)
  newState.hunger = Math.max(0, state.hunger - DECAY_RATES.HUNGER * hoursPassed);

  // 2. Cleanliness (Base Decay: Medium)
  // If hunger is low, cleanliness decays faster (messy eating)
  const cleanlinessDecayMultiplier = state.hunger < 30 ? 1.5 : 1;
  newState.cleanliness = Math.max(
    0,
    state.cleanliness - DECAY_RATES.CLEANLINESS * hoursPassed * cleanlinessDecayMultiplier,
  );

  // 3. Energy (Base Decay: Slow)
  newState.energy = Math.max(0, state.energy - DECAY_RATES.ENERGY * hoursPassed);

  // 4. Happiness (Base Decay: Medium)
  // Faster decay if other stats are low
  const happinessDecayMultiplier =
    (state.hunger < 30 ? 1.2 : 1) * (state.cleanliness < 30 ? 1.2 : 1) * (state.energy < 30 ? 1.2 : 1);

  newState.happiness = Math.max(0, state.happiness - DECAY_RATES.HAPPINESS * hoursPassed * happinessDecayMultiplier);

  // 5. Health (Dependent Decay)
  // Health decreases only if critical conditions exist
  let healthDecayMultiplier = 0;

  if (newState.hunger <= 0) healthDecayMultiplier += 1;
  if (newState.happiness <= 0) healthDecayMultiplier += 1;
  if (newState.cleanliness <= 0) healthDecayMultiplier += 1;

  if (healthDecayMultiplier > 0) {
    newState.health = Math.max(0, state.health - DECAY_RATES.HEALTH * hoursPassed * healthDecayMultiplier);
  } else if (
    newState.hunger > 60 &&
    newState.happiness > 60 &&
    newState.energy > 60 &&
    newState.cleanliness > 60 &&
    newState.health < 100
  ) {
    // Health slowly recovers if all other stats are good
    newState.health = Math.min(100, state.health + DECAY_RATES.HEALTH * hoursPassed);
  }

  return newState;
}

export function debugDecreaseStats(state: PetState): PetState {
  return {
    ...state,
    hunger: Math.max(0, state.hunger - 20),
    happiness: Math.max(0, state.happiness - 20),
    energy: Math.max(0, state.energy - 20),
    health: Math.max(0, state.health - 10),
    cleanliness: Math.max(0, state.cleanliness - 15),
  };
}

export function debugIncreaseStats(state: PetState): PetState {
  return {
    ...state,
    hunger: Math.min(100, state.hunger + 20),
    happiness: Math.min(100, state.happiness + 20),
    energy: Math.min(100, state.energy + 20),
    health: Math.min(100, state.health + 10),
    cleanliness: Math.min(100, state.cleanliness + 15),
  };
}
