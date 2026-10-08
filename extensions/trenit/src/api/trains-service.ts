import * as api from "./rfi-api";
import { Train } from "../models/train";
import { capitalize } from "../utils";

export function getUrl(stationId: string, arrivals: string): string {
  const params = new URLSearchParams();
  params.append("placeId", stationId);
  params.append("arrivals", arrivals);
  return "https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?" + params.toString();
}

export function mapTrains(apiTrains: api.ApiTrain[]): Train[] {
  return apiTrains.map((train) => {
    let isDelayed = false;
    let delay = train.delay;
    if (/^[0-9]+$/.test(delay)) {
      delay = `+${delay}′`;
      isDelayed = true;
    }

    const category = fixCategory(train.category);
    const icon = categoryToIcon(category);
    const isReplacedByBus = checkIsReplacedByBus(icon, delay, train.notes);

    const isCancelled = delay == "Cancellato";

    // Train is cancelled but sometimes notes are missing for a while, so we don't know if it's replaced by bus or what
    const isIncomplete = isCancelled && train.notes == "";

    // Hide platform if it's "punto fermata" (bus) or if the train is replaced by bus (platform doesn't matter anymore)
    const platform = train.platform == "PF" || isReplacedByBus ? "" : train.platform;

    let stops: string[] = [];
    const regex = /([A-ZÈÀÌÒÙ' .]+?) \((\d{1,2}[:.]\d{2})\)/g;
    if (regex.test(train.notes)) {
      stops = [...train.notes.matchAll(regex)].map(
        (match) => `${match[1].replace(/'{2,}/g, "'").trim()} (${match[2].replace(".", ":")})`,
      );
    }

    return {
      carrier: capitalize(train.carrier),
      category: category,
      icon: icon,
      number: train.number,
      destination: capitalize(train.destination),
      time: train.time,
      platform: platform,
      delay: delay,
      isDelayed: isDelayed,
      isCancelled: isCancelled,
      isBlinking: train.isBlinking,
      isReplacedByBus,
      isIncomplete: isIncomplete,
      stops: stops,
    };
  });
}

function fixCategory(category: string): string {
  category = category.replace("Categoria ", "");

  // AV has "ITALO" as the alt text
  category = category.replace(/italo/i, "Alta Velocità");
  // Regionale Veloce is called "Civitavecchia Express Regionale Veloce"
  category = category.replace(/civitavecchia express/i, "").trim();

  return capitalize(category);
}

function categoryToIcon(category: string): string | null {
  category = category.toLowerCase();
  if (category.includes("autocorsa")) {
    return "bus";
  } else if (category.includes("regionale veloce")) {
    return "rv";
  } else if (category.includes("regionale")) {
    return "r";
  } else if (category.includes("eurocity")) {
    return "ec";
  } else if (category.includes("alta velocità")) {
    return "av";
  } else if (category.includes("intercity")) {
    return "ic";
  } else if (category.includes("intercity notte")) {
    return "icn";
  }

  return null;
}

function checkIsReplacedByBus(icon: string | null, delay: string, notes: string): boolean {
  let isReplacedByBus = false;
  // If the train is marked as cancelled, look if it's replaced by a bus.
  // Note: sometimes the train is marked as replaced by bus even if it's actually not at the current station
  // (it could be in previous stations), hence the "cancelled" check, which tells us if it's actually a train.
  if (icon != "bus" && delay == "Cancellato") {
    isReplacedByBus = notes.toLowerCase().includes("autosostituito") || notes.toLowerCase().includes("bus sostitutivo");
  }

  return isReplacedByBus;
}

export function getContentForCopyToClipboardAction(train: Train, isArrival: boolean) {
  if (isArrival) {
    const content = `Train from ${train.destination} (${train.number}), with scheduled arrival at ${train.time} at platform ${train.platform}`;
    if (train.isCancelled) {
      return content + ", is cancelled";
    } else if (train.isReplacedByBus) {
      return content + ", is replaced by a bus";
    } else if (train.isDelayed) {
      return content + `, is delayed by ${train.delay} minutes`;
    }
    return content + ", is on time";
  } else {
    const content = `Train to ${train.destination} (${train.number}), with scheduled departure at ${train.time} from platform ${train.platform}`;
    if (train.isCancelled) {
      return content + ", is cancelled";
    } else if (train.isReplacedByBus) {
      return content + ", is replaced by a bus";
    } else if (train.isDelayed) {
      return content + `, is delayed by ${train.delay} minutes`;
    }
    return content + ", is on time";
  }
}
